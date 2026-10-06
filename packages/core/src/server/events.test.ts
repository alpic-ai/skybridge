import { createHmac, randomBytes } from "node:crypto";
import http from "node:http";
import net, { type AddressInfo } from "node:net";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { deliverEvent, type EventSubscription, Skybridge } from "./index.js";

type Received = { headers: http.IncomingHttpHeaders; body: string };

async function startReceiver() {
  const received: Received[] = [];
  const state = { dropResponses: false };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      received.push({ headers: req.headers, body });
      if (state.dropResponses) {
        res.writeHead(200, { "content-length": "1000" });
        res.write("partial");
        setTimeout(() => res.socket?.destroy(), 20);
        return;
      }
      const parsed = JSON.parse(body);
      res.setHeader("content-type", "application/json");
      res.end(
        parsed.type === "verification"
          ? JSON.stringify({ challenge: parsed.challenge })
          : "{}",
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/hooks`, received, server, state };
}

let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe("MCP events", () => {
  it("verifies the callback, hands the subscription to the hooks, and delivers signed events", async () => {
    const receiver = await startReceiver();
    const subscriptions = new Map<string, EventSubscription>();
    const app = new Skybridge({
      name: "t",
      version: "0.0.1",
      handler: (server) =>
        server.registerEvent(
          {
            name: "comment.created",
            inputSchema: { documentId: z.string() },
            payloadSchema: { documentId: z.string(), excerpt: z.string() },
          },
          {
            onSubscribe: (_args, { subscription }) => {
              subscriptions.set(subscription.id, subscription);
            },
            onUnsubscribe: (_args, { subscription }) => {
              subscriptions.delete(subscription.id);
            },
          },
        ),
    });

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const send = clientTransport.send.bind(clientTransport);
    clientTransport.send = (message: JSONRPCMessage) =>
      send(message, {
        authInfo: {
          token: "t",
          clientId: "chatgpt",
          scopes: [],
          extra: { subject: "user-1" },
        },
      });
    const instance = await app.createServerInstance();
    await instance.connect(serverTransport);
    const client = new Client({ name: "c", version: "0.0.1" });
    await client.connect(clientTransport);
    cleanup = async () => {
      await client.close();
      await instance.close();
      receiver.server.close();
    };

    expect(
      (instance.getCapabilities() as Record<string, unknown>).events,
    ).toEqual({});
    const list = await client.request(
      { method: "events/list", params: {} },
      z.object({
        events: z.array(
          z.object({ name: z.string(), delivery: z.array(z.string()) }),
        ),
      }),
    );
    expect(list.events).toEqual([
      expect.objectContaining({
        name: "comment.created",
        delivery: ["webhook"],
      }),
    ]);

    const secret = `whsec_${randomBytes(32).toString("base64")}`;
    const subscription = await client.request(
      {
        method: "events/subscribe",
        params: {
          name: "comment.created",
          arguments: { documentId: "doc-1" },
          delivery: { mode: "webhook", url: receiver.url, secret },
        },
      },
      z.object({ id: z.string(), refreshBefore: z.string() }),
    );
    expect(receiver.received.map(({ body }) => JSON.parse(body).type)).toEqual([
      "verification",
    ]);

    const stored = subscriptions.get(subscription.id);
    expect(stored).toMatchObject({ url: receiver.url, secret });
    if (!stored) {
      return;
    }
    await expect(
      deliverEvent(stored, {
        name: "comment.created",
        id: "evt_1",
        data: { documentId: "doc-1", excerpt: "hello" },
      }),
    ).resolves.toEqual({ ok: true });

    expect(receiver.received).toHaveLength(2);
    const [, delivery] = receiver.received;
    expect(JSON.parse(delivery?.body ?? "")).toMatchObject({
      eventId: "evt_1",
      name: "comment.created",
      data: { documentId: "doc-1", excerpt: "hello" },
    });
    const headers: http.IncomingHttpHeaders = delivery?.headers ?? {};
    expect(headers["x-mcp-subscription-id"]).toBe(subscription.id);
    const expected = createHmac(
      "sha256",
      Buffer.from(secret.slice(6), "base64"),
    )
      .update(
        `${headers["webhook-id"]}.${headers["webhook-timestamp"]}.${delivery?.body}`,
      )
      .digest("base64");
    expect(headers["webhook-signature"]).toBe(`v1,${expected}`);

    receiver.state.dropResponses = true;
    const delivered = deliverEvent(stored, {
      name: "comment.created",
      data: { documentId: "doc-1", excerpt: "dropped" },
    });
    await expect(
      Promise.race([
        delivered,
        new Promise((resolve) => setTimeout(() => resolve("hung"), 2_000)),
      ]),
    ).resolves.toMatchObject({ ok: false, retryable: true });

    await client.request(
      {
        method: "events/unsubscribe",
        params: {
          name: "comment.created",
          arguments: { documentId: "doc-1" },
          delivery: { url: receiver.url },
        },
      },
      z.object({}),
    );
    expect(subscriptions.size).toBe(0);

    let connections = 0;
    const privateTarget = net.createServer((socket) => {
      connections += 1;
      socket.destroy();
    });
    await new Promise<void>((resolve) =>
      privateTarget.listen(0, "127.0.0.1", resolve),
    );
    const { port: privatePort } = privateTarget.address() as AddressInfo;
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await expect(
        client.request(
          {
            method: "events/subscribe",
            params: {
              name: "comment.created",
              arguments: { documentId: "doc-1" },
              delivery: {
                url: `https://127.0.0.1:${privatePort}/hooks`,
                secret,
              },
            },
          },
          z.object({}),
        ),
      ).rejects.toMatchObject({ code: -32015 });
      expect(connections).toBe(0);
    } finally {
      process.env.NODE_ENV = nodeEnv;
      privateTarget.close();
    }
  });
});
