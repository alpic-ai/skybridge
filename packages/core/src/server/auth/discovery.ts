import {
  type OAuthMetadata,
  OAuthMetadataSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";

/**
 * Discovered AS metadata + `jwks_uri` — the SDK's `OAuthMetadata` omits it (its
 * OAuth client never verifies tokens), but we need it to verify token signatures
 * via JWKS, so we re-type the field for typed access.
 */
export type DiscoveredMetadata = OAuthMetadata & { jwks_uri?: string };

const WELL_KNOWN = [
  "/.well-known/openid-configuration",
  "/.well-known/oauth-authorization-server",
];

const DISCOVERY_TIMEOUT_MS = 5000;

/** Fetches and validates an authorization server's discovery document. */
export async function discoverAuthorizationServer(
  issuer: string,
): Promise<DiscoveredMetadata> {
  const base = issuer.replace(/\/$/, "");
  const errors: string[] = [];

  for (const path of WELL_KNOWN) {
    const url = `${base}${path}`;
    // Any failure (network/timeout, non-2xx, non-JSON, invalid metadata, issuer
    // mismatch) records a per-URL reason and falls through to the next path.
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const parsed = OAuthMetadataSchema.safeParse(await res.json());
      if (!parsed.success) {
        throw new Error(`invalid metadata (${parsed.error.message})`);
      }
      // RFC 8414 §3.3: issuer must match the fetch origin (slash-insensitive).
      if (parsed.data.issuer.replace(/\/$/, "") !== base) {
        throw new Error(`issuer mismatch: ${parsed.data.issuer}`);
      }
      return parsed.data as DiscoveredMetadata;
    } catch (err) {
      errors.push(
        `${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  throw new Error(`OAuth discovery failed for ${issuer}: ${errors.join("; ")}`);
}
