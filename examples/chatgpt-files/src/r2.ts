import "./env.js";
import { AwsClient } from "aws4fetch";

const R2_URL_TTL_SECS = 15 * 60;

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
  process.env;

if (!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET)) {
  throw new Error(
    "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
  );
}

const ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const client = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: "auto",
  service: "s3",
});

// R2 speaks the S3 API, so sign with SigV4 in the "auto" region. signQuery
// puts the signature in the URL, giving a presigned link that works for a
// plain GET (download) or PUT (upload) with no further auth.
function presign(method: "GET" | "PUT", key: string, ttlSecs: number) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return client.sign(`${ENDPOINT}/${path}?X-Amz-Expires=${ttlSecs}`, {
    method,
    aws: { signQuery: true },
  });
}

/** Uploads the archive to R2 and returns a presigned GET URL to download it. */
export async function uploadToR2(
  key: string,
  data: Buffer,
  contentType = "application/zip",
): Promise<string> {
  const put = await presign("PUT", key, 300);
  let response: Response;
  try {
    response = await fetch(put.url, {
      method: "PUT",
      body: new Uint8Array(data),
      headers: { "content-type": contentType },
    });
  } catch (err) {
    throw new Error("Could not reach Cloudflare R2.", { cause: err });
  }
  if (!response.ok) {
    throw new Error(`R2 upload failed (HTTP ${response.status}).`);
  }
  return (await presign("GET", key, R2_URL_TTL_SECS)).url;
}
