import { randomUUID } from "node:crypto";
import { isR2Enabled, R2_URL_TTL, uploadToR2 } from "./r2.js";

export type StoredArchive = {
  data: Buffer;
  fileName: string;
  mimeType: string;
  expiresAt: number;
};

// Durée de vie d'une archive : 15 minutes.
const TTL_MS = 15 * 60 * 1000;
export const ARCHIVE_TTL_SECONDS = TTL_MS / 1000;

const store = new Map<string, StoredArchive>();

// Supprime les archives expirées (appelé à chaque accès).
function sweep(): void {
  const now = Date.now();
  for (const [id, archive] of store) {
    if (archive.expiresAt <= now) {
      store.delete(id);
    }
  }
}

/** Range une archive et renvoie son identifiant. */
export function putArchive(
  data: Buffer,
  fileName: string,
  mimeType = "application/zip",
): string {
  sweep();
  const id = randomUUID();
  store.set(id, {
    data,
    fileName,
    mimeType,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

/** Récupère une archive (ou `undefined` si absente/expirée). */
export function getArchive(id: string): StoredArchive | undefined {
  sweep();
  return store.get(id);
}

export type StoredResult = {
  id: string;
  downloadUrl: string;
  expiresInSeconds: number;
};

/**
 * Range une archive et renvoie son `id` + une URL de download.
 * - En production (R2 configuré) : PUT vers Cloudflare R2, URL GET présignée.
 * - En dev (R2 absent) : stockage mémoire + URL servie par `/files/:id`.
 */
export async function storeArchive(
  data: Buffer,
  fileName: string,
  buildLocalUrl: (id: string) => string,
): Promise<StoredResult> {
  const isEnabled = isR2Enabled();
  console.log(isEnabled);
  if (isR2Enabled()) {
    const key = `${randomUUID()}/${fileName}`;
    const downloadUrl = await uploadToR2(key, data);
    return { id: key, downloadUrl, expiresInSeconds: R2_URL_TTL };
  }

  const id = putArchive(data, fileName);
  return {
    id,
    downloadUrl: buildLocalUrl(id),
    expiresInSeconds: ARCHIVE_TTL_SECONDS,
  };
}
