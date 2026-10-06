import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import http from "node:http";
import https from "node:https";
import {
  INVALID_PARAMS,
  ProtocolError,
  type McpServer as SdkMcpServer,
  type ServerContext,
  type StandardSchemaV1,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { globalHttpAgent, globalHttpsAgent } from "request-filtering-agent";
import { Webhook } from "standardwebhooks";
import { z } from "zod/v4";

const EVENTS_ERROR = {
  NotFound: -32011,
  Forbidden: -32012,
  Unsupported: -32014,
  CallbackEndpointError: -32015,
} as const;

const MAX_PAYLOAD_BYTES = 256 * 1024;
const DELIVERY_TIMEOUT_MS = 10_000;
const VERIFICATION_CACHE_MS = 60 * 60_000;
const MIN_TTL_MS = 60_000;
const DEFAULT_TTL_MS = 30 * 60_000;
const MAX_TTL_MS = 24 * 60 * 60_000;

/**
 * A webhook subscription, as passed to `onSubscribe`. Whatever delivers the
 * events POSTs them to `url`, signed with `secret`, until `expiresAt`.
 */
export interface EventSubscription {
  /** Stable across refreshes: the same user subscribing to the same event with the same arguments and callback gets the same `id`. */
  id: string;
  /** Callback URL deliveries are POSTed to. */
  url: string;
  /** Standard Webhooks signing secret (`whsec_…`). A refresh may carry a new one. */
  secret: string;
  /** When the subscription lapses unless the host refreshes it. */
  expiresAt: Date;
}

/** An event occurrence, as passed to {@link deliverEvent}. */
export interface EventOccurrence {
  /** Event type name, as registered with `registerEvent`. */
  name: string;
  /** Stable identifier the host uses to drop duplicates, ideally the upstream's. Reuse it when retrying. */
  id: string;
  /** When the event happened. Defaults to now. */
  timestamp?: Date;
  /** Payload matching the event's `payloadSchema`. */
  data: unknown;
}

/** Outcome of {@link deliverEvent}. Retry with the same event `id` when `retryable`. */
export type DeliveryResult =
  | { ok: true }
  | { ok: false; reason: string; retryable: boolean; status?: number };

type EventSchema =
  | Record<string, StandardSchemaWithJSON>
  | StandardSchemaWithJSON;

export type InferEventSchema<T extends EventSchema> =
  T extends StandardSchemaWithJSON
    ? StandardSchemaV1.InferOutput<T>
    : T extends Record<string, StandardSchemaWithJSON>
      ? {
          [K in keyof T as undefined extends StandardSchemaV1.InferOutput<T[K]>
            ? never
            : K]: StandardSchemaV1.InferOutput<T[K]>;
        } & {
          [K in keyof T as undefined extends StandardSchemaV1.InferOutput<T[K]>
            ? K
            : never]?: StandardSchemaV1.InferOutput<T[K]>;
        }
      : never;

/** The `registerEvent` config: how the event type is described in `events/list`. */
export interface EventConfig<TInput extends EventSchema> {
  /** Stable, specific name such as `comment.created`. */
  name: string;
  /** What the event is and when it fires. */
  description?: string;
  /** Subscription arguments (filters): a Zod shape or a Standard Schema object. */
  inputSchema?: TInput;
  /** Shape of the delivered `data`: a Zod shape or a Standard Schema object. */
  payloadSchema: EventSchema;
  _meta?: Record<string, unknown>;
}

/** What `registerEvent` does when the host subscribes and unsubscribes. */
export interface EventHooks<TArguments, TExtra> {
  /**
   * Runs on every `events/subscribe`, including the host's refreshes, once
   * the callback URL is verified. Hand the subscription to whatever delivers
   * the events, keyed by `subscription.id`. Throw (e.g. a `ProtocolError`) to
   * reject it, for instance when the user may not access what the arguments
   * point to.
   */
  onSubscribe(
    args: TArguments,
    context: { subscription: EventSubscription; extra: TExtra },
  ): void | Promise<void>;
  /** Runs on `events/unsubscribe`. Stop delivering to `subscription.id`. */
  onUnsubscribe(
    args: TArguments,
    context: { subscription: Pick<EventSubscription, "id">; extra: TExtra },
  ): void | Promise<void>;
}

type RegisteredEvent = {
  name: string;
  description?: string;
  inputSchema: StandardSchemaWithJSON;
  payloadSchema: StandardSchemaWithJSON;
  _meta?: Record<string, unknown>;
  hooks: EventHooks<Record<string, unknown>, ServerContext>;
};

function toStandardSchema(schema: EventSchema): StandardSchemaWithJSON {
  return "~standard" in schema
    ? (schema as StandardSchemaWithJSON)
    : z.object(schema as unknown as z.ZodRawShape);
}

async function validate(
  schema: StandardSchemaWithJSON,
  value: unknown,
): Promise<Record<string, unknown>> {
  const result = await schema["~standard"].validate(value);
  if (result.issues) {
    throw new ProtocolError(
      INVALID_PARAMS,
      `Invalid arguments: ${result.issues.map((issue) => issue.message).join(", ")}`,
    );
  }
  return result.value as Record<string, unknown>;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function subscriberOf(ctx: ServerContext): string {
  const authInfo = ctx.http?.authInfo;
  const subject = authInfo?.extra?.subject;
  const subscriber = typeof subject === "string" ? subject : authInfo?.clientId;
  if (!subscriber) {
    throw new ProtocolError(
      EVENTS_ERROR.Forbidden,
      "Webhook subscriptions require an authenticated caller",
    );
  }
  return subscriber;
}

function isValidSecret(secret: string): boolean {
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    return false;
  }
  const length = Buffer.from(encoded, "base64").length;
  return length >= 24 && length <= 64;
}

const insecureCallbacksAllowed = () => process.env.NODE_ENV !== "production";

function checkCallbackUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProtocolError(INVALID_PARAMS, "delivery.url is not a valid URL");
  }
  const allowed =
    url.protocol === "https:" ||
    (url.protocol === "http:" && insecureCallbacksAllowed());
  if (!allowed) {
    throw new ProtocolError(INVALID_PARAMS, "delivery.url must use https");
  }
  return url.href;
}

type PostOutcome =
  | { ok: true; body: string }
  | { ok: false; status?: number; reason: string };

function post(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<PostOutcome> {
  const signal = AbortSignal.timeout(DELIVERY_TIMEOUT_MS);
  const failure = (error?: NodeJS.ErrnoException): PostOutcome => ({
    ok: false,
    reason: signal.aborted
      ? "timeout"
      : error?.code?.startsWith("ERR_TLS") || error?.code?.includes("CERT")
        ? "tls_error"
        : "connection_refused",
  });
  const [client, agent] = url.startsWith("https:")
    ? [https, globalHttpsAgent]
    : [http, globalHttpAgent];
  return new Promise((resolve) => {
    const request = client.request(
      url,
      {
        method: "POST",
        headers: { ...headers, "content-length": Buffer.byteLength(body) },
        signal,
        ...(!insecureCallbacksAllowed() && { agent }),
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size <= 64 * 1024) {
            chunks.push(chunk);
          }
        });
        response.on("end", () => {
          if (status >= 200 && status < 300) {
            resolve({ ok: true, body: Buffer.concat(chunks).toString() });
          } else {
            resolve({
              ok: false,
              status,
              reason: status >= 500 ? "http_5xx" : "http_4xx",
            });
          }
        });
        response.on("error", (error) => resolve(failure(error)));
        response.on("close", () => resolve(failure()));
      },
    );
    request.on("error", (error) => resolve(failure(error)));
    request.end(body);
  });
}

function signedPost(
  subscription: { id: string; url: string; secret: string | string[] },
  messageId: string,
  body: string,
): Promise<PostOutcome> {
  const signedAt = new Date();
  const secrets = [subscription.secret].flat();
  return post(
    subscription.url,
    {
      "content-type": "application/json",
      "webhook-id": messageId,
      "webhook-timestamp": String(Math.floor(signedAt.getTime() / 1000)),
      "webhook-signature": secrets
        .map((secret) => new Webhook(secret).sign(messageId, signedAt, body))
        .join(" "),
      "x-mcp-subscription-id": subscription.id,
    },
    body,
  );
}

/**
 * @experimental POST one event to a subscription handed out by `onSubscribe`,
 * as MCP Events expects: the event envelope, Standard Webhooks signature
 * headers, a 10 second deadline and, outside development, no requests to
 * private addresses. Pass the old and new secrets during a rotation so both
 * sign the delivery. A subscription past `expiresAt` is not posted to.
 * Retrying is up to the caller. API may change.
 *
 * @example
 * ```ts
 * const result = await deliverEvent(subscription, {
 *   name: "comment.created",
 *   id: comment.id,
 *   data: { documentId: comment.documentId, excerpt: comment.text.slice(0, 280) },
 * });
 * if (!result.ok && result.retryable) {
 *   await queue.retryLater(subscription, comment);
 * }
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/register-event
 */
export async function deliverEvent(
  subscription: Pick<EventSubscription, "id" | "url"> & {
    secret: string | string[];
    expiresAt: Date | string;
  },
  event: EventOccurrence,
): Promise<DeliveryResult> {
  if (!(new Date(subscription.expiresAt).getTime() > Date.now())) {
    return { ok: false, reason: "expired", retryable: false };
  }
  const body = JSON.stringify({
    eventId: event.id,
    name: event.name,
    timestamp: (event.timestamp ?? new Date()).toISOString(),
    data: event.data,
    cursor: null,
  });
  if (Buffer.byteLength(body) > MAX_PAYLOAD_BYTES) {
    throw new Error(
      `Event "${event.name}" payload exceeds ${MAX_PAYLOAD_BYTES} bytes; send a summary and expose a tool to fetch the rest.`,
    );
  }
  const outcome = await signedPost(subscription, event.id, body);
  if (outcome.ok) {
    return { ok: true };
  }
  const status = outcome.status ?? 0;
  return {
    ...outcome,
    retryable:
      status !== 410 && status !== 413 && (status < 300 || status >= 400),
  };
}

const verifiedCallbacks = new Map<string, number>();

async function verifyCallback(
  subscriber: string,
  subscription: EventSubscription,
): Promise<void> {
  const key = `${subscriber}\n${subscription.url}`;
  const now = Date.now();
  if ((verifiedCallbacks.get(key) ?? 0) > now) {
    return;
  }
  const challenge = randomBytes(24).toString("base64url");
  const outcome = await signedPost(
    subscription,
    `msg_verification_${randomBytes(12).toString("hex")}`,
    JSON.stringify({ type: "verification", challenge }),
  );
  let echoed: unknown;
  if (outcome.ok) {
    try {
      echoed = JSON.parse(outcome.body)?.challenge;
    } catch {}
  }
  const matched =
    typeof echoed === "string" &&
    echoed.length === challenge.length &&
    timingSafeEqual(Buffer.from(echoed), Buffer.from(challenge));
  if (!matched) {
    throw new ProtocolError(
      EVENTS_ERROR.CallbackEndpointError,
      "Callback endpoint verification failed",
      { reason: outcome.ok ? "challenge_failed" : outcome.reason },
    );
  }
  for (const [cached, until] of verifiedCallbacks) {
    if (until <= now) {
      verifiedCallbacks.delete(cached);
    }
  }
  verifiedCallbacks.set(key, now + VERIFICATION_CACHE_MS);
}

const SubscriptionKeySchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
  delivery: z.object({ url: z.string() }),
});

const SubscribeParamsSchema = SubscriptionKeySchema.extend({
  delivery: z.object({
    mode: z.string().optional(),
    url: z.string(),
    secret: z.string(),
  }),
  cursor: z.string().nullable().optional(),
  ttlMs: z.number().nullable().optional(),
});

/**
 * The event types registered on one server, and the `events/*` handlers that
 * serve them.
 *
 * @internal
 */
export class EventRegistry {
  private readonly events = new Map<string, RegisteredEvent>();

  constructor(
    private readonly server: Pick<SdkMcpServer["server"], "setRequestHandler">,
  ) {}

  add(config: EventConfig<EventSchema>, hooks: EventHooks<never, never>): void {
    if (this.events.has(config.name)) {
      throw new Error(`Event "${config.name}" is already registered.`);
    }
    if (this.events.size === 0) {
      this.install();
    }
    this.events.set(config.name, {
      name: config.name,
      description: config.description,
      inputSchema: toStandardSchema(config.inputSchema ?? {}),
      payloadSchema: toStandardSchema(config.payloadSchema),
      _meta: config._meta,
      hooks,
    });
  }

  private install(): void {
    this.server.setRequestHandler(
      "events/list",
      { params: z.object({ cursor: z.string().optional() }).optional() },
      () => ({
        events: [...this.events.values()].map((event) => ({
          name: event.name,
          ...(event.description && { description: event.description }),
          delivery: ["webhook"],
          inputSchema: event.inputSchema["~standard"].jsonSchema.input({
            target: "draft-2020-12",
          }),
          payloadSchema: event.payloadSchema["~standard"].jsonSchema.output({
            target: "draft-2020-12",
          }),
          ...(event._meta && { _meta: event._meta }),
        })),
      }),
    );

    this.server.setRequestHandler(
      "events/subscribe",
      { params: SubscribeParamsSchema },
      async (params, ctx) => {
        if (params.delivery.mode && params.delivery.mode !== "webhook") {
          throw new ProtocolError(
            EVENTS_ERROR.Unsupported,
            `Unsupported delivery mode: ${params.delivery.mode}`,
            { feature: "deliveryMode", value: params.delivery.mode },
          );
        }
        if (!isValidSecret(params.delivery.secret)) {
          throw new ProtocolError(
            INVALID_PARAMS,
            "delivery.secret must be whsec_ followed by base64 of 24 to 64 bytes",
          );
        }
        const { event, subscriber, args, id, url } = await this.resolve(
          params,
          ctx,
        );
        const ttl =
          params.ttlMs === null ? MAX_TTL_MS : (params.ttlMs ?? DEFAULT_TTL_MS);
        const subscription: EventSubscription = {
          id,
          url,
          secret: params.delivery.secret,
          expiresAt: new Date(
            Date.now() + Math.min(Math.max(ttl, MIN_TTL_MS), MAX_TTL_MS),
          ),
        };
        await verifyCallback(subscriber, subscription);
        await event.hooks.onSubscribe(args, { subscription, extra: ctx });
        return {
          id,
          refreshBefore: subscription.expiresAt.toISOString(),
          cursor: null,
          truncated: false,
        };
      },
    );

    this.server.setRequestHandler(
      "events/unsubscribe",
      { params: SubscriptionKeySchema },
      async (params, ctx) => {
        const { event, args, id } = await this.resolve(params, ctx);
        await event.hooks.onUnsubscribe(args, {
          subscription: { id },
          extra: ctx,
        });
        return {};
      },
    );
  }

  private async resolve(
    params: z.infer<typeof SubscriptionKeySchema>,
    ctx: ServerContext,
  ) {
    const event = this.events.get(params.name);
    if (!event) {
      throw new ProtocolError(
        EVENTS_ERROR.NotFound,
        `Unknown event: ${params.name}`,
        { kind: "event" },
      );
    }
    const url = checkCallbackUrl(params.delivery.url);
    const subscriber = subscriberOf(ctx);
    const rawArguments = params.arguments ?? {};
    const args = await validate(event.inputSchema, rawArguments);
    const hash = createHash("sha256")
      .update(canonicalJson([subscriber, url, event.name, rawArguments]))
      .digest("hex");
    return { event, subscriber, args, url, id: `sub_${hash.slice(0, 32)}` };
  }
}
