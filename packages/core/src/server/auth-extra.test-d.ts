import { expectTypeOf, test } from "vitest";
import { z } from "zod";
import { Skybridge } from "./app.js";
import type { OAuthConfig } from "./auth/index.js";
import { customProvider } from "./auth/providers/custom.js";
import { workosProvider } from "./auth/providers/workos.js";
import type { TokenVerifier } from "./auth.js";

const workosOAuth = await workosProvider({ domain: "d", audience: "a" });
const customOAuth = await workosProvider<{ tenant: string }>({
  domain: "d",
  audience: "a",
});

test("a server with no oauth keeps the untyped claim bag", () => {
  new Skybridge({ name: "t", version: "0" }, (server) =>
    server.registerTool(
      { name: "plain", inputSchema: { q: z.string() } },
      (_args, extra) => {
        expectTypeOf(extra.http?.authInfo?.extra).toEqualTypeOf<
          Record<string, unknown> | undefined
        >();
        return { content: "ok" };
      },
    ),
  );
});

test("provider claims reach tool handlers", () => {
  new Skybridge({ name: "t", version: "0", oauth: workosOAuth }, (server) =>
    server
      .registerTool({ name: "a", inputSchema: {} }, (_args, extra) => {
        expectTypeOf(extra.http?.authInfo?.extra?.org_id).toEqualTypeOf<
          string | undefined
        >();
        expectTypeOf(extra.http?.authInfo?.extra?.permissions).toEqualTypeOf<
          string[] | undefined
        >();
        // @ts-expect-error not a WorkOS claim
        extra.http?.authInfo?.extra?.nope;
        return { content: "a" };
      })
      .registerTool({ name: "b", inputSchema: {} }, (_args, extra) => {
        expectTypeOf(extra.http?.authInfo?.extra?.sid).toEqualTypeOf<
          string | undefined
        >();
        return { content: "b" };
      }),
  );
});

test("registered claims survive the mapping into extra", () => {
  new Skybridge({ name: "t", version: "0", oauth: workosOAuth }, (server) =>
    server.registerTool({ name: "a", inputSchema: {} }, (_args, extra) => {
      expectTypeOf(extra.http?.authInfo?.extra?.iss).toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf(extra.http?.authInfo?.extra?.iat).toEqualTypeOf<
        number | undefined
      >();
      return { content: "a" };
    }),
  );
});

test("a hand-written verifier carries its own claims", async () => {
  type Claims = { subject?: string; email?: string };
  const verifier: TokenVerifier<Claims> = {
    async verifyAccessToken(token) {
      return { token, clientId: "c", scopes: [], expiresAt: 1, extra: {} };
    },
  };
  const { oauthMetadata } = await customProvider({
    issuer: "https://idp.example.com",
  });
  new Skybridge(
    { name: "t", version: "0", oauth: { oauthMetadata, verifier } },
    (server) =>
      server.registerTool({ name: "a", inputSchema: {} }, (_args, extra) => {
        expectTypeOf(extra.http?.authInfo?.extra?.email).toEqualTypeOf<
          string | undefined
        >();
        return { content: "a" };
      }),
  );
});

test("a config must carry a verifier", () => {
  // @ts-expect-error a verifier is required
  const missing: OAuthConfig = {
    oauthMetadata: workosOAuth.oauthMetadata,
  };
  void missing;
});

test("a provider override adds claims without dropping the provider's", () => {
  const app = new Skybridge(
    { name: "t", version: "0", oauth: customOAuth },
    (server) =>
      server.registerTool({ name: "a", inputSchema: {} }, (_args, extra) => {
        expectTypeOf(extra.http?.authInfo?.extra?.tenant).toEqualTypeOf<
          string | undefined
        >();
        expectTypeOf(extra.http?.authInfo?.extra?.org_id).toEqualTypeOf<
          string | undefined
        >();
        return { content: "a" };
      }),
  );

  app.mcpMiddleware("tools/call", (_request, extra, next) => {
    expectTypeOf(extra.http?.authInfo?.extra?.tenant).toEqualTypeOf<
      string | undefined
    >();
    return next();
  });
});
