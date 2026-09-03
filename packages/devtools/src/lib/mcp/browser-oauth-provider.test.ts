import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserOAuthProvider } from "./browser-oauth-provider.js";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});
vi.stubGlobal("window", {
  location: { origin: "http://localhost:5173", pathname: "/" },
});

describe("BrowserOAuthProvider", () => {
  beforeEach(() => store.clear());

  it("expectedState reads without generating, state() persists across calls", () => {
    const provider = new BrowserOAuthProvider();
    expect(provider.expectedState()).toBeUndefined();
    const generated = provider.state();
    expect(provider.expectedState()).toBe(generated);
    expect(provider.state()).toBe(generated);
  });

  it("throws on a missing code verifier instead of sending an empty one", () => {
    const provider = new BrowserOAuthProvider();
    expect(() => provider.codeVerifier()).toThrow(/Missing PKCE code verifier/);
    provider.saveCodeVerifier("v");
    expect(provider.codeVerifier()).toBe("v");
  });

  it("round-trips discovery state and clears it on discovery/all scopes", () => {
    const provider = new BrowserOAuthProvider();
    const discovery = { authorizationServerUrl: "https://as.example" };
    provider.saveDiscoveryState(discovery as never);
    expect(provider.discoveryState()).toEqual(discovery);
    provider.invalidateCredentials("discovery");
    expect(provider.discoveryState()).toBeUndefined();
    provider.saveDiscoveryState(discovery as never);
    provider.invalidateCredentials("all");
    expect(provider.discoveryState()).toBeUndefined();
  });

  it("verifier scope clears both the code verifier and the state", () => {
    const provider = new BrowserOAuthProvider();
    provider.saveCodeVerifier("v");
    provider.state();
    provider.invalidateCredentials("verifier");
    expect(provider.expectedState()).toBeUndefined();
    expect(() => provider.codeVerifier()).toThrow();
  });
});
