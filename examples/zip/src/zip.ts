import { deflateRawSync } from "node:zlib";

export type ZipEntry = {
  name: string;
  data: Buffer;
};

// Table CRC-32 (IEEE), calculée une seule fois au chargement.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Date DOS fixe (1980-01-01) → archives déterministes.
const DOS_TIME = 0;
const DOS_DATE = 0x21;

/**
 * Construit une archive ZIP (compressée en DEFLATE) à partir de fichiers en
 * mémoire, en n'utilisant que le `zlib` natif de Node. Renvoie l'archive
 * complète sous forme de Buffer.
 */
export function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const compressed = deflateRawSync(entry.data);
    const compressedSize = compressed.length;
    const uncompressedSize = entry.data.length;

    // --- En-tête local (30 octets + nom) ---
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // version requise
    local.writeUInt16LE(0x0800, 6); // flags : nom en UTF-8
    local.writeUInt16LE(8, 8); // méthode : deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressedSize, 18);
    local.writeUInt32LE(uncompressedSize, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // longueur champ "extra"
    localParts.push(local, nameBuf, compressed);

    // --- Entrée d'annuaire central (46 octets + nom) ---
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4); // version créatrice
    central.writeUInt16LE(20, 6); // version requise
    central.writeUInt16LE(0x0800, 8); // flags
    central.writeUInt16LE(8, 10); // méthode
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressedSize, 20);
    central.writeUInt32LE(uncompressedSize, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // commentaire
    central.writeUInt16LE(0, 34); // n° disque
    central.writeUInt16LE(0, 36); // attrs internes
    central.writeUInt32LE(0, 38); // attrs externes
    central.writeUInt32LE(offset, 42); // offset de l'en-tête local
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const localData = Buffer.concat(localParts);
  const centralDir = Buffer.concat(centralParts);

  // --- Fin d'annuaire central (22 octets) ---
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // signature
  end.writeUInt16LE(0, 4); // n° de ce disque
  end.writeUInt16LE(0, 6); // disque où commence l'annuaire
  end.writeUInt16LE(entries.length, 8); // nb d'entrées sur ce disque
  end.writeUInt16LE(entries.length, 10); // nb total d'entrées
  end.writeUInt32LE(centralDir.length, 12); // taille de l'annuaire
  end.writeUInt32LE(localData.length, 16); // offset de l'annuaire
  end.writeUInt16LE(0, 20); // longueur commentaire

  return Buffer.concat([localData, centralDir, end]);
}