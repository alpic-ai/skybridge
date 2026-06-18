import { createHash, createHmac } from "node:crypto";

// --- Configuration R2 (lue depuis l'environnement) ---
// R2 est compatible S3 : on signe les requêtes en SigV4 (region "auto").
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;

const REGION = "auto";
const SERVICE = "s3";

/** Durée de validité de l'URL présignée (par défaut 15 min). */
export const R2_URL_TTL = Number(process.env.R2_URL_TTL ?? 15 * 60);

/** `true` si toutes les variables R2 requises sont présentes. */
export function isR2Enabled(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

function requireConfig() {
  if (!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET)) {
    throw new Error("R2 storage is not configured.");
  }
  return {
    host: `${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    bucket: BUCKET,
  };
}

// Encodage URI conforme à AWS (RFC 3986). Les "/" du chemin sont préservés.
function uriEncode(value: string, keepSlash = false): string {
  let out = "";
  for (const char of value) {
    if (/[A-Za-z0-9\-._~]/.test(char) || (keepSlash && char === "/")) {
      out += char;
    } else {
      for (const byte of Buffer.from(char, "utf8")) {
        out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
      }
    }
  }
  return out;
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function signingKey(secret: string, dateStamp: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

function amzDates(date = new Date()): { amzDate: string; dateStamp: string } {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

/**
 * Construit une URL SigV4 présignée (query-string auth, payload non signé).
 * Fonctionne aussi bien pour un GET (download) que pour un PUT (upload).
 */
function presign(method: "GET" | "PUT", key: string, ttl: number): string {
  const { host, bucket, accessKeyId, secretAccessKey } = requireConfig();
  const { amzDate, dateStamp } = amzDates();
  const canonicalUri = `/${uriEncode(bucket)}/${uriEncode(key, true)}`;
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(ttl),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(params[k])}`)
    .join("&");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = hmac(
    signingKey(secretAccessKey, dateStamp),
    stringToSign,
  ).toString("hex");
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Envoie l'archive vers R2 et renvoie une URL GET présignée pour la télécharger. */
export async function uploadToR2(
  key: string,
  data: Buffer,
  contentType = "application/zip",
): Promise<string> {
  const putUrl = presign("PUT", key, 300);
  const response = await fetch(putUrl, {
    method: "PUT",
    body: new Uint8Array(data),
    headers: { "content-type": contentType },
  });
  if (!response.ok) {
    throw new Error(`R2 upload failed (HTTP ${response.status}).`);
  }
  return presign("GET", key, R2_URL_TTL);
}
