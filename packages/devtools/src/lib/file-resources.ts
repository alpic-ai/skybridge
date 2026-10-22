const files = new Map<string, File>();

export function addFileResource(file: File): string {
  const uri = `devtools-file://${crypto.randomUUID()}/${encodeURIComponent(file.name)}`;
  files.set(uri, file);
  return uri;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function readFileResource({
  uri,
  _meta,
}: {
  uri: string;
  _meta?: { "openai/resource"?: { representation?: "text" | "blob" } };
}): Promise<{ contents: Record<string, unknown>[] } | undefined> {
  const file = files.get(uri);
  if (!file) {
    return undefined;
  }
  const content =
    _meta?.["openai/resource"]?.representation === "text"
      ? { text: await file.text() }
      : { blob: await readAsBase64(file) };
  return {
    contents: [
      {
        uri,
        mimeType: file.type || "application/octet-stream",
        ...content,
        _meta: { "openai/resource": { writable: false } },
      },
    ],
  };
}
