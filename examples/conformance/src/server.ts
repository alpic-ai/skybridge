import { intentMiddleware } from "@alpic-ai/insights";
import {
  audio,
  embeddedResource,
  FileRef,
  image,
  McpServer,
  resourceLink,
  text,
} from "skybridge/server";
import { z } from "zod";

/**
 * Skybridge Conformance server.
 *
 * The single rendered view (`conformance`) hosts an in-iframe runner that
 * exercises every Skybridge web/client API against whatever host renders it.
 * The tools below exist purely to give those checks something to call:
 *
 * - `conformance`       — the view-bound tool; its result carries known
 *                         markers in `structuredContent` (model + view) and
 *                         `_meta` (view only) so the runner can assert the
 *                         three response audiences are kept separate.
 * - `echo` / `ping`     — widget-accessible targets for `useCallTool`
 *                         (with-args and no-args).
 * - `fail-soft`         — returns `isError: true` (a *resolved* error result).
 * - `boom`              — throws; surfaces as an `isError` result too. The
 *                         runner reaches `useCallTool`'s rejected/error state
 *                         by calling a *non-existent* tool instead.
 * - `content-showcase`  — every content helper, incl. both base64 branches.
 * - `with-output-schema`— declares an `outputSchema`; drives the typed
 *                         `generateHelpers` assertions.
 * - `accept-file`       — `FileRef` input + `openai/fileParams`.
 * - `secured-tool`      — per-tool `securitySchemes` (registration only).
 * - `export-report`     — receives the runner's markdown report and echoes it
 *                         back as `content` so it lands in the conversation.
 *
 * Built as one fluent `.registerTool(...)` chain so `typeof server` carries the
 * full registry for `generateHelpers<AppType>()` (see `helpers.ts`).
 */
const server = new McpServer(
  {
    name: "skybridge-conformance",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  // Catch-all protocol middleware — exercises the `mcpMiddleware` API. Pure
  // passthrough so it never alters behaviour the runner observes.
  .mcpMiddleware(async (_request, _extra, next) => next())
  .mcpMiddleware(intentMiddleware())
  .registerTool(
    {
      name: "conformance",
      title: "Skybridge Conformance",
      description:
        "Render the Skybridge conformance checklist. Runs in-view checks against the current host and lets you export a markdown report.",
      inputSchema: {
        runLabel: z
          .string()
          .optional()
          .describe("Optional label shown at the top of the report."),
      },
      view: {
        component: "conformance",
        description:
          "A comprehensive Skybridge conformance runner: exercises every web API and reports pass/fail/info per feature.",
        // Allowlist the targets the runner's openExternal checks point at, so
        // they skip the host's safe-link confirmation modal.
        csp: {
          redirectDomains: [
            "https://docs.skybridge.tech",
            "https://github.com",
            "https://alpic.ai",
          ],
        },
      },
      _meta: {
        // The runner asserts this reaches the view (via responseMetadata) but
        // never leaks into structuredContent or the model-facing content.
        secret: "meta-is-view-only",
        "skybridge/conformance": "meta-marker",
      },
    },
    async ({ runLabel }) => {
      const structuredContent = {
        // Visible to both the model and the view.
        marker: "structured-content-visible-to-model-and-view",
        runLabel: runLabel ?? null,
      };
      return {
        structuredContent,
        content: [text(JSON.stringify(structuredContent))],
        isError: false,
        _meta: {
          secret: "meta-is-view-only",
          "skybridge/conformance": "meta-marker",
        },
      };
    },
  )
  .registerTool(
    {
      name: "echo",
      description:
        "Echo a value back. Widget-accessible target for useCallTool.",
      inputSchema: {
        value: z.string().describe("Any string to echo back."),
      },
      _meta: { "openai/widgetAccessible": true },
    },
    async ({ value }) => {
      const structuredContent = { echo: value, length: value.length };
      return {
        structuredContent,
        content: [text(`echo: ${value}`)],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "ping",
      description:
        "Take no arguments and return a pong. Widget-accessible target for no-arg useCallTool.",
      _meta: { "openai/widgetAccessible": true },
    },
    async () => {
      const structuredContent = { pong: true };
      return {
        structuredContent,
        content: [text("pong")],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "fail-soft",
      description:
        "Return a resolved error result (isError: true) without throwing.",
      _meta: { "openai/widgetAccessible": true },
    },
    async () => {
      return {
        structuredContent: { ok: false },
        content: [text("This tool intentionally returns isError: true.")],
        isError: true,
      };
    },
  )
  .registerTool(
    {
      name: "boom",
      description: "Throw inside the handler (surfaces as an isError result).",
      _meta: { "openai/widgetAccessible": true },
    },
    async () => {
      throw new Error("Intentional handler exception for conformance testing.");
    },
  )
  .registerTool(
    {
      name: "content-showcase",
      description:
        "Return every MCP content block type via Skybridge's content helpers, exercising both base64 input branches.",
      _meta: { "openai/widgetAccessible": true },
    },
    async () => {
      // A 1x1 transparent PNG, provided two ways: as raw bytes (Uint8Array,
      // which the helper base64-encodes) and as an already-base64 string. Both
      // must yield identical, valid image blocks.
      const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
      const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
      // A short silent WAV header, base64-encoded.
      const wavBase64 =
        "UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

      const structuredContent = {
        blocks: [
          "text",
          "image(bytes)",
          "image(base64)",
          "audio",
          "resource(text)",
          "resource(blob)",
          "resource_link",
        ],
      };

      return {
        structuredContent,
        content: [
          text("A sample of every content helper.", {
            audience: ["user", "assistant"],
            priority: 1,
          }),
          image(pngBytes, "image/png"),
          image(pngBase64, "image/png"),
          audio(wavBase64, "audio/wav"),
          embeddedResource({
            uri: "file:///conformance/hello.txt",
            mimeType: "text/plain",
            text: "Inline text resource.",
          }),
          embeddedResource({
            uri: "file:///conformance/pixel.png",
            mimeType: "image/png",
            blob: pngBase64,
          }),
          resourceLink({
            uri: "https://docs.skybridge.tech",
            name: "skybridge-docs",
            title: "Skybridge docs",
            mimeType: "text/html",
          }),
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "with-output-schema",
      description:
        "Sum and multiply two numbers. Declares an outputSchema to drive typed-helper checks.",
      inputSchema: {
        a: z.number().describe("First operand."),
        b: z.number().describe("Second operand."),
      },
      outputSchema: {
        sum: z.number().describe("a + b"),
        product: z.number().describe("a * b"),
      },
      _meta: { "openai/widgetAccessible": true },
    },
    async ({ a, b }) => {
      const structuredContent = { sum: a + b, product: a * b };
      return {
        structuredContent,
        content: [text(`sum=${a + b} product=${a * b}`)],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "accept-file",
      description:
        "Accept a host-managed file reference. Pairs FileRef input with openai/fileParams.",
      inputSchema: {
        document: FileRef.describe("A host file reference."),
      },
      _meta: {
        "openai/widgetAccessible": true,
        "openai/fileParams": ["document"],
      },
    },
    async ({ document }) => {
      const structuredContent = {
        received: {
          file_id: document.file_id,
          file_name: document.file_name ?? null,
          mime_type: document.mime_type ?? null,
          has_download_url: Boolean(document.download_url),
        },
      };
      return {
        structuredContent,
        content: [text(`Received file ${document.file_id}`)],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "secured-tool",
      description:
        "Declares per-tool securitySchemes (registration only — no enforcement here).",
      securitySchemes: [
        { type: "noauth" },
        { type: "oauth2", scopes: ["conformance:read"] },
      ],
      _meta: { "openai/widgetAccessible": true },
    },
    async (_args, extra) => {
      const structuredContent = { hadAuthInfo: Boolean(extra.authInfo) };
      return {
        structuredContent,
        content: [
          text(
            `securitySchemes are advertised on this tool. authInfo present: ${Boolean(
              extra.authInfo,
            )}`,
          ),
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "export-report",
      description:
        "Receive the conformance runner's markdown report and surface it in the conversation.",
      inputSchema: {
        markdown: z.string().describe("The full markdown report."),
        passed: z.number().int().describe("Number of passed checks."),
        failed: z.number().int().describe("Number of failed checks."),
        total: z
          .number()
          .int()
          .describe("Number of scored checks (pass + fail + timeout)."),
        runtime: z.string().describe("Detected host runtime."),
      },
      _meta: { "openai/widgetAccessible": true },
    },
    async ({ markdown, passed, failed, total, runtime }) => {
      return {
        structuredContent: { passed, failed, total, runtime },
        content: [text(markdown)],
        isError: false,
      };
    },
  );

export default await server.run();

export type AppType = typeof server;
