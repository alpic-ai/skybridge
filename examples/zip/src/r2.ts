import "./env.js";
import { createHash, createHmac } from "node:crypto";

const REGION = "auto";
const SERVICE = "s3";

/** Durée de validité de l'URL présignée (par défaut 15 min). */
export const R2_URL_TTL = Number(process.env.R2_URL_TTL ?? 15 * 60);

function requireConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!(accountId && accessKeyId && secretAccessKey && bucket)) {
    throw new Error(
      "Cloudflare R2 n'est pas configuré. Définissez R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY et R2_BUCKET.",
    );
  }

  return {
    host: `${accountId}.r2.cloudflarestorage.com`,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

/** Vérifie la configuration R2 au démarrage du serveur. */
export function assertR2Configured(): void {
  requireConfig();
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
  let response: Response;
  try {
    response = await fetch(putUrl, {
      method: "PUT",
      body: new Uint8Array(data),
      headers: { "content-type": contentType },
    });
  } catch (err) {
    throw new Error(
      "Impossible de contacter Cloudflare R2. Vérifiez R2_ACCOUNT_ID et vos clés API R2 dans .env.",
      { cause: err },
    );
  }
  if (!response.ok) {
    throw new Error(`R2 upload failed (HTTP ${response.status}).`);
  }
  return presign("GET", key, R2_URL_TTL);
}
