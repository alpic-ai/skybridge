import { OAuthMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
import { z } from "zod";

/**
 * Discovery doc validated as OAuth AS metadata + `jwks_uri`. The SDK's
 * `OAuthMetadataSchema` omits `jwks_uri` (its client never verifies tokens), but
 * we need it for JWKS token verification, so we extend the schema to keep it.
 */
const DiscoverySchema = OAuthMetadataSchema.extend({
  jwks_uri: z.string().optional(),
});
export type DiscoveredMetadata = z.infer<typeof DiscoverySchema>;

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
  // First valid doc lacking a registration_endpoint, kept as a fallback so a
  // genuinely non-DCR IdP still resolves (and is rejected later by the caller).
  let fallback: DiscoveredMetadata | undefined;

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
      const meta = DiscoverySchema.parse(await res.json());
      // RFC 8414 §3.3: issuer must match the fetch origin (slash-insensitive).
      if (meta.issuer.replace(/\/$/, "") !== base) {
        throw new Error(`issuer mismatch: ${meta.issuer}`);
      }
      // Prefer the document that advertises DCR: some IdPs (e.g. Clerk) serve a
      // valid openid-configuration without `registration_endpoint` yet expose
      // it at oauth-authorization-server. Keep looking past a doc that omits it.
      if (meta.registration_endpoint) {
        return meta;
      }
      fallback ??= meta;
    } catch (err) {
      errors.push(
        `${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (fallback) {
    return fallback;
  }
  throw new Error(`OAuth discovery failed for ${issuer}: ${errors.join("; ")}`);
}
