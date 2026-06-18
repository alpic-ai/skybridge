import {
  type OAuthMetadata,
  OAuthMetadataSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";

/** Discovered metadata; `jwks_uri` is an RFC field the SDK type doesn't expose. */
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
    let res: Response;
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
      });
    } catch (err) {
      errors.push(
        `${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    if (!res.ok) {
      errors.push(`${url}: HTTP ${res.status}`);
      continue;
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      errors.push(`${url}: response is not valid JSON`);
      continue;
    }
    const parsed = OAuthMetadataSchema.safeParse(json);
    if (!parsed.success) {
      errors.push(`${url}: invalid metadata (${parsed.error.message})`);
      continue;
    }
    // RFC 8414 §3.3: the document's issuer must match the URL it came from.
    // Compare slash-insensitively so a canonically slash-terminated issuer
    // isn't rejected by the trailing-slash strip applied to `base`.
    if (parsed.data.issuer.replace(/\/$/, "") !== base) {
      errors.push(
        `${url}: issuer mismatch (${parsed.data.issuer} !== ${base})`,
      );
      continue;
    }
    return parsed.data as DiscoveredMetadata;
  }

  throw new Error(`OAuth discovery failed for ${issuer}: ${errors.join("; ")}`);
}
