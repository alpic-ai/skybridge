import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

const PREFIX = "skybridge-devtools-oauth";

const KEYS = {
  clientInfo: `${PREFIX}:client-info`,
  tokens: `${PREFIX}:tokens`,
  codeVerifier: `${PREFIX}:code-verifier`,
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

  clientInformation(): OAuthClientInformationMixed | undefined {
    const raw = localStorage.getItem(KEYS.clientInfo);
    return raw ? JSON.parse(raw) : undefined;
  }

  saveClientInformation(info: OAuthClientInformationMixed): void {
    localStorage.setItem(KEYS.clientInfo, JSON.stringify(info));
  }

  tokens(): OAuthTokens | undefined {
    const raw = localStorage.getItem(KEYS.tokens);
    return raw ? JSON.parse(raw) : undefined;
  }

  saveTokens(tokens: OAuthTokens): void {
    localStorage.setItem(KEYS.tokens, JSON.stringify(tokens));
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    window.location.href = authorizationUrl.toString();
  }

  saveCodeVerifier(codeVerifier: string): void {
    localStorage.setItem(KEYS.codeVerifier, codeVerifier);
  }

  codeVerifier(): string {
    return localStorage.getItem(KEYS.codeVerifier) ?? "";
  }

  invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier"): void {
    if (scope === "all" || scope === "tokens") {
      localStorage.removeItem(KEYS.tokens);
    }
    if (scope === "all" || scope === "client") {
      localStorage.removeItem(KEYS.clientInfo);
    }
    if (scope === "all" || scope === "verifier") {
      localStorage.removeItem(KEYS.codeVerifier);
    }
  }
}
