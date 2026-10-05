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
const RETRY_DELAYS_MS = [1_000, 5_000];
const VERIFICATION_CACHE_MS = 60 * 60_000;
const SECRET_ROTATION_GRACE_MS = 5 * 60_000;
const MIN_TTL_MS = 60_000;
const DEFAULT_TTL_MS = 30 * 60_000;
const MAX_TTL_MS = 24 * 60 * 60_000;

/**
 * A webhook subscription as held by an {@link EventStore}. Skybridge creates,
 * refreshes and deletes these; a store only persists them.
 */
export interface EventSubscription {
  /** Deterministic over `(principal, url, name, arguments)`. */
  id: string;
  /** The authenticated subject that subscribed. */
  principal: string;
  /** Event type name. */
  name: string;
  /** Subscription arguments, validated against the event's `inputSchema`. */
  arguments: Record<string, unknown>;
  /** Callback URL deliveries are POSTed to. */
  url: string;
  /** Standard Webhooks signing secret (`whsec_…`). */
  secret: string;
  /** Secret being rotated out, still used to dual-sign until `until`. */
  previousSecret?: { secret: string; until: number };
  /** Expiry, in epoch milliseconds. */
  expiresAt: number;
}

/**
 * Where webhook subscriptions live between the `events/subscribe` request
 * that creates them and the {@link Skybridge.emit} call that delivers to them.
 * Skybridge ignores subscriptions past `expiresAt`, so a store only needs to
 * persist them; dropping expired entries is optional housekeeping.
 *
 * The default in-memory store is enough for a single long-lived process. Pass
 * your own when the app runs on several instances or restarts often.
 */
export interface EventStore {
  get(id: string): Promise<EventSubscription | undefined>;
  set(subscription: EventSubscription): Promise<void>;
  delete(id: string): Promise<void>;
  /** Every stored subscription to the event named `name`. */
  listByEvent(name: string): Promise<EventSubscription[]>;
}

/** Options for MCP Events, passed as `events` to {@link Skybridge}. */
export interface EventsOptions {
  /** Where subscriptions are kept. Defaults to an in-memory store. */
  store?: EventStore;
}

/** An event occurrence as passed to {@link Skybridge.emit}. */
export interface EmittedEvent<TData> {
  /** Stable identifier used for deduplication, ideally the upstream's. Generated when omitted. */
  id?: string;
  /** When the event happened. Defaults to now. */
  timestamp?: Date;
  /** Payload, validated against the event's `payloadSchema`. */
  data: TData;
}

/** Type marker for a registered event, produced by `registerEvent`. */
export type EventDef<TArguments = unknown, TPayload = unknown> = {
  arguments: TArguments;
  payload: TPayload;
};

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
export interface EventConfig<
  TName extends string,
  TInput extends EventSchema,
  TPayload extends EventSchema,
> {
  /** Stable, specific name such as `comment.created`. */
  name: TName;
  /** What the event is and when it fires. */
  description?: string;
  /** Subscription arguments (filters): a Zod shape or a Standard Schema object. */
  inputSchema?: TInput;
  /** Shape of the delivered `data`: a Zod shape or a Standard Schema object. */
  payloadSchema: TPayload;
  _meta?: Record<string, unknown>;
}

/** Optional per-event behavior passed as the second argument of `registerEvent`. */
export interface EventHooks<TArguments, TPayload, TExtra> {
  /**
   * Decide whether an emitted event goes to a given subscription. Without it,
   * every subscription to the event receives every emit.
   */
  match?(
    event: { id: string; data: TPayload },
    subscription: { arguments: TArguments; principal: string },
  ): boolean | Promise<boolean>;
  /**
   * Runs on every `events/subscribe`, including refreshes, once the callback
   * URL is verified and before the subscription is stored. Throw (e.g. a
   * `ProtocolError`) to reject it, for instance when the caller may not access
   * what the arguments point to.
   */
  onSubscribe?(args: TArguments, extra: TExtra): void | Promise<void>;
}

type RegisteredEvent = {
  name: string;
  description?: string;
  inputSchema: StandardSchemaWithJSON;
  payloadSchema: StandardSchemaWithJSON;
  _meta?: Record<string, unknown>;
  hooks: EventHooks<Record<string, unknown>, unknown, ServerContext>;
};

function toStandardSchema(schema: EventSchema): StandardSchemaWithJSON {
  return "~standard" in schema
    ? (schema as StandardSchemaWithJSON)
    : z.object(schema as unknown as z.ZodRawShape);
}

async function validate(
  schema: StandardSchemaWithJSON,
  value: unknown,
  what: string,
): Promise<unknown> {
  const result = await schema["~standard"].validate(value);
  if (result.issues) {
    throw new ProtocolError(
      INVALID_PARAMS,
      `Invalid ${what}: ${result.issues.map((issue) => issue.message).join(", ")}`,
    );
  }
  return result.value;
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

function principalOf(ctx: ServerContext): string {
  const authInfo = ctx.http?.authInfo;
  const subject = authInfo?.extra?.subject;
  const principal = typeof subject === "string" ? subject : authInfo?.clientId;
  if (!principal) {
    throw new ProtocolError(
      EVENTS_ERROR.Forbidden,
      "Webhook subscriptions require an authenticated caller",
    );
  }
  return principal;
}

function isValidSecret(secret: string): boolean {
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    return false;
  }
  const length = Buffer.from(encoded, "base64").length;
  return length >= 24 && length <= 64;
}

const insecureCallbacksAllowed = () =>
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

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

type DeliveryOutcome =
  | { ok: true; status: number; body: string }
  | { ok: false; status?: number; reason: string };

const isRetryable = (status = 0) =>
  status !== 410 && status !== 413 && (status < 300 || status >= 400);

function post(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<DeliveryOutcome> {
  const signal = AbortSignal.timeout(DELIVERY_TIMEOUT_MS);
  const failure = (error?: NodeJS.ErrnoException): DeliveryOutcome => ({
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
            resolve({
              ok: true,
              status,
              body: Buffer.concat(chunks).toString(),
            });
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
  subscription: EventSubscription,
  messageId: string,
  body: string,
): Promise<DeliveryOutcome> {
  const signedAt = new Date();
  const secrets = [subscription.secret];
  if (
    subscription.previousSecret &&
    subscription.previousSecret.until > signedAt.getTime()
  ) {
    secrets.push(subscription.previousSecret.secret);
  }
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

function memoryEventStore(): EventStore {
  const subscriptions = new Map<string, EventSubscription>();
  return {
    get: async (id) => subscriptions.get(id),
    set: async (subscription) => {
      subscriptions.set(subscription.id, subscription);
    },
    delete: async (id) => {
      subscriptions.delete(id);
    },
    listByEvent: async (name) => {
      const now = Date.now();
      for (const [id, subscription] of subscriptions) {
        if (subscription.expiresAt <= now) {
          subscriptions.delete(id);
        }
      }
      return [...subscriptions.values()].filter((sub) => sub.name === name);
    },
  };
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
 * App-wide MCP Events state: the registered event types, the subscription
 * store and the callback verification cache. One per {@link Skybridge} app,
 * shared by every per-request server.
 *
 * @internal
 */
export class EventsRuntime {
  private readonly store: EventStore;
  private readonly events = new Map<string, RegisteredEvent>();
  private readonly verifiedCallbacks = new Map<string, number>();

  constructor(options: EventsOptions = {}) {
    this.store = options.store ?? memoryEventStore();
  }

  register(
    config: EventConfig<string, EventSchema, EventSchema>,
    hooks: EventHooks<never, never, never> = {},
  ): void {
    this.events.set(config.name, {
      name: config.name,
      description: config.description,
      inputSchema: toStandardSchema(config.inputSchema ?? {}),
      payloadSchema: toStandardSchema(config.payloadSchema),
      _meta: config._meta,
      hooks,
    });
  }

  /** Install the `events/*` handlers on a per-request server. */
  install(server: Pick<SdkMcpServer["server"], "setRequestHandler">): void {
    server.setRequestHandler(
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

    server.setRequestHandler(
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
        const { event, subscription } = await this.resolve(params, ctx);
        const ttl =
          params.ttlMs === null ? MAX_TTL_MS : (params.ttlMs ?? DEFAULT_TTL_MS);
        const candidate: EventSubscription = {
          ...subscription,
          secret: params.delivery.secret,
          expiresAt:
            Date.now() + Math.min(Math.max(ttl, MIN_TTL_MS), MAX_TTL_MS),
        };
        await this.verifyCallback(candidate);
        await event.hooks.onSubscribe?.(subscription.arguments, ctx);

        const existing = await this.liveSubscription(subscription.id);
        const previousSecret =
          existing && existing.secret !== candidate.secret
            ? {
                secret: existing.secret,
                until: Date.now() + SECRET_ROTATION_GRACE_MS,
              }
            : existing?.previousSecret;
        await this.store.set({
          ...candidate,
          ...(previousSecret && { previousSecret }),
        });
        return {
          id: candidate.id,
          refreshBefore: new Date(candidate.expiresAt).toISOString(),
          cursor: null,
          truncated: false,
        };
      },
    );

    server.setRequestHandler(
      "events/unsubscribe",
      { params: SubscriptionKeySchema },
      async (params, ctx) => {
        const { subscription } = await this.resolve(params, ctx);
        await this.store.delete(subscription.id);
        return {};
      },
    );
  }

  /** Deliver one event to every live, matching subscription. */
  async emit(name: string, emitted: EmittedEvent<unknown>): Promise<void> {
    const event = this.events.get(name);
    if (!event) {
      throw new Error(`Event "${name}" is not registered.`);
    }
    const data = await validate(event.payloadSchema, emitted.data, "payload");
    const id = emitted.id ?? `evt_${randomBytes(12).toString("hex")}`;
    const body = JSON.stringify({
      eventId: id,
      name,
      timestamp: (emitted.timestamp ?? new Date()).toISOString(),
      data,
      cursor: null,
    });
    if (Buffer.byteLength(body) > MAX_PAYLOAD_BYTES) {
      throw new Error(
        `Event "${name}" payload exceeds ${MAX_PAYLOAD_BYTES} bytes; send a summary and expose a tool to fetch the rest.`,
      );
    }
    const now = Date.now();
    const subscriptions = (await this.store.listByEvent(name)).filter(
      (sub) => sub.expiresAt > now,
    );
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const matches =
          (await event.hooks.match?.(
            { id, data },
            {
              arguments: subscription.arguments,
              principal: subscription.principal,
            },
          )) ?? true;
        if (matches) {
          await this.deliver(subscription, id, body, 0);
        }
      }),
    );
    const failures = results.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        `Event ${id} was not delivered to ${failures.length} subscription(s) whose match hook threw.`,
      );
    }
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
    const principal = principalOf(ctx);
    const rawArguments = params.arguments ?? {};
    const args = (await validate(
      event.inputSchema,
      rawArguments,
      "arguments",
    )) as Record<string, unknown>;
    const hash = createHash("sha256")
      .update(canonicalJson([principal, url, event.name, rawArguments]))
      .digest("hex");
    return {
      event,
      subscription: {
        id: `sub_${hash.slice(0, 32)}`,
        principal,
        name: event.name,
        arguments: args,
        url,
      },
    };
  }

  private async deliver(
    subscription: EventSubscription,
    eventId: string,
    body: string,
    attempt: number,
  ): Promise<void> {
    const outcome = await signedPost(subscription, eventId, body);
    if (outcome.ok) {
      return;
    }
    const delay = RETRY_DELAYS_MS[attempt];
    if (!isRetryable(outcome.status) || delay === undefined) {
      console.warn(
        `skybridge: dropped event ${eventId} for subscription ${subscription.id} (${outcome.reason})`,
      );
      return;
    }
    setTimeout(() => {
      this.liveSubscription(subscription.id)
        .then((live) => live && this.deliver(live, eventId, body, attempt + 1))
        .catch(() => {});
    }, delay).unref();
  }

  private async liveSubscription(id: string) {
    const subscription = await this.store.get(id);
    if (subscription && subscription.expiresAt <= Date.now()) {
      await this.store.delete(id);
      return undefined;
    }
    return subscription;
  }

  private async verifyCallback(subscription: EventSubscription): Promise<void> {
    const key = `${subscription.principal}\n${subscription.url}`;
    const now = Date.now();
    if ((this.verifiedCallbacks.get(key) ?? 0) > now) {
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
    for (const [cached, until] of this.verifiedCallbacks) {
      if (until <= now) {
        this.verifiedCallbacks.delete(cached);
      }
    }
    this.verifiedCallbacks.set(key, now + VERIFICATION_CACHE_MS);
  }
}
