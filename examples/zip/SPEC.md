# Zip Files App

## Value Proposition

Bundle several files into a single downloadable `.zip` without leaving the
conversation. Target: anyone juggling a handful of attachments in ChatGPT who
just wants "give me all of these as one zip". Pain today: you download files one
by one, switch to a desktop tool, zip them, and come back.

**Core actions**: pick files (from the device or the ChatGPT library), zip them
server-side, download the archive.

## Why LLM?

**Conversational win**: "Zip these three files for me" is one sentence; the view
turns the model's/host's file attachments into a picker the user can confirm.
**LLM adds**: it routes the right attachments to the tool and narrates the
result ("created `archive.zip`, 3 files, 1.2 MB").
**What LLM lacks**: it can't compress bytes or host a downloadable artifact —
the server does the zipping (Node `zlib`) and parks the result in temporary
object storage.

## UI Overview

**First view**: an empty dropzone-style panel with two actions — "Upload" (from
device) and "Pick from library" (ChatGPT files) — plus a disabled "Create zip"
button.
**Picking**: each picked file shows as a removable chip with its name/size.
**Zipping**: pressing "Create zip" calls the `zip-files` tool; the button shows
a spinner while the server fetches, compresses, and uploads.
**End state**: a result card with the archive name, file count, original vs
compressed size, and a "Download zip" button that opens the temporary URL.

## Product Context

- **Host**: ChatGPT (Apps SDK). File picking relies on `useFiles`
  (`upload`, `selectFiles`, `getDownloadUrl`) which is ChatGPT-only.
- **Compression**: Node built-in `zlib` (`deflateRawSync`) + a hand-written ZIP
  container (local headers, central directory, CRC-32). No archive library.
- **Storage**: temporary object storage for the resulting archive.
  - **Production**: Cloudflare R2 (S3-compatible, free tier). The server PUTs the
    archive and returns a presigned GET URL that expires after `R2_URL_TTL`
    seconds. Chosen because Alpic Cloud only routes `/mcp`, so the app can't
    serve the archive from its own Express server in production.
  - **Local dev fallback**: when R2 env vars are absent, the archive is held in
    an in-memory store with a TTL and served from a custom Express route
    (`/files/:id`). The download URL is derived from the incoming request host
    so it works behind `skybridge dev --tunnel`.
- **Constraints**: archives are ephemeral (TTL), capped total input size to keep
  memory bounded.

## UX Flows

Zip files:
1. Pick one or more files (device upload and/or ChatGPT library).
2. Press "Create zip" → `zip-files` tool runs.
3. Download the returned archive.

## Tools and Views

**View: `zip-files`**
- **Input**: `{ files: FileRef[], archiveName?: string }`
  - `_meta["openai/fileParams"] = ["files"]` so ChatGPT can route attachments.
  - `_meta["openai/widgetAccessible"] = true` so the view can call it directly.
- **Output**: `{ archive: FileRef, fileCount, originalBytes, zippedBytes, expiresInSeconds }`
- **Views**: single screen — file picker → result card.
- **Behavior**: holds picked files as local state; resolves a fresh
  `download_url` per file, builds `FileRef[]`, calls `zip-files`, then opens the
  returned `archive.download_url` via `useOpenExternal`.
- **Handler**: fetches each `FileRef.download_url`, builds the ZIP with `zlib`,
  uploads to storage (R2 or local fallback), returns the archive `FileRef`.
