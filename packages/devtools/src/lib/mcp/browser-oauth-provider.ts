import type {
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthDiscoveryState,
  StoredOAuthClientInformation,
  StoredOAuthTokens,
} from "@modelcontextprotocol/client";

const PREFIX = "skybridge-devtools-oauth";

const KEYS = {
  clientInfo: `${PREFIX}:client-info`,
  tokens: `${PREFIX}:tokens`,
  codeVerifier: `${PREFIX}:code-verifier`,
  state: `${PREFIX}:state`,
  discovery: `${PREFIX}:discovery`,
} as const;

export class BrowserOAuthProvider implements OAuthClientProvider {
  get redirectUrl(): string {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("oauth_callback", "true");
    return url.toString();
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "Skybridge Devtools",
      client_uri: window.location.origin,
    };
  }

  clientInformation(): StoredOAuthClientInformation | undefined {
    const raw = localStorage.getItem(KEYS.clientInfo);
    return raw ? JSON.parse(raw) : undefined;
  }

  saveClientInformation(info: StoredOAuthClientInformation): void {
    localStorage.setItem(KEYS.clientInfo, JSON.stringify(info));
  }

  tokens(): StoredOAuthTokens | undefined {
    const raw = localStorage.getItem(KEYS.tokens);
    return raw ? JSON.parse(raw) : undefined;
  }

  saveTokens(tokens: StoredOAuthTokens): void {
    localStorage.setItem(KEYS.tokens, JSON.stringify(tokens));
  }

  state(): string {
    const stored = localStorage.getItem(KEYS.state);
    if (stored) {
      return stored;
    }
    const generated = crypto.randomUUID();
    localStorage.setItem(KEYS.state, generated);
    return generated;
  }

  expectedState(): string | undefined {
    return localStorage.getItem(KEYS.state) ?? undefined;
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    window.location.href = authorizationUrl.toString();
  }

  saveCodeVerifier(codeVerifier: string): void {
    localStorage.setItem(KEYS.codeVerifier, codeVerifier);
  }

  codeVerifier(): string {
    const stored = localStorage.getItem(KEYS.codeVerifier);
    if (!stored) {
      throw new Error(
        "Missing PKCE code verifier: the sign-in flow was not started in this browser, or its storage was cleared. Retry signing in.",
      );
    }
    return stored;
  }

  saveDiscoveryState(state: OAuthDiscoveryState): void {
    localStorage.setItem(KEYS.discovery, JSON.stringify(state));
  }

  discoveryState(): OAuthDiscoveryState | undefined {
    const raw = localStorage.getItem(KEYS.discovery);
    return raw ? JSON.parse(raw) : undefined;
  }

  invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery",
  ): void {
    if (scope === "all" || scope === "tokens") {
      localStorage.removeItem(KEYS.tokens);
    }
    if (scope === "all" || scope === "client") {
      localStorage.removeItem(KEYS.clientInfo);
    }
    if (scope === "all" || scope === "verifier") {
      localStorage.removeItem(KEYS.codeVerifier);
      localStorage.removeItem(KEYS.state);
    }
    if (scope === "all" || scope === "discovery") {
      localStorage.removeItem(KEYS.discovery);
    }
  }
}
