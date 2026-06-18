import { randomUUID } from "node:crypto";
import { R2_URL_TTL, uploadToR2 } from "./r2.js";

export type StoredResult = {
  id: string;
  downloadUrl: string;
  expiresInSeconds: number;
};

/** Envoie l'archive vers R2 et renvoie son identifiant + une URL de téléchargement présignée. */
export async function storeArchive(
  data: Buffer,
  fileName: string,
): Promise<StoredResult> {
  const key = `${randomUUID()}/${fileName}`;
  const downloadUrl = await uploadToR2(key, data);
  return { id: key, downloadUrl, expiresInSeconds: R2_URL_TTL };
}
