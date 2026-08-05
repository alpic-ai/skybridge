import { vi } from "vitest";

const actual =
  await vi.importActual<typeof import("../verify.js")>("../verify.js");

export const createJwksVerifier = vi.fn(actual.createJwksVerifier);

/**
 * The JWKS parameters a provider handed to `createJwksVerifier`: the issuer and
 * JWKS URL it derived from discovery, and the audience it expects. Substitute
 * this module for `../verify.js` to assert on them:
 *
 * ```ts
 * vi.mock("../verify.js", () => import("./verify-spy.js"));
 * import { lastJwksConfig as jwks } from "./verify-spy.js";
 * ```
 */
export const lastJwksConfig = () => {
  const call = createJwksVerifier.mock.lastCall;
  if (!call) {
    throw new Error("createJwksVerifier was not called");
  }
  return call[0];
};
