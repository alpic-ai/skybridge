import { describe, expect, it } from "vitest";
import { __setBuildManifest, McpServer } from "./index.js";

function manifestOf(
  server: McpServer,
): Record<string, { file: string }> | null {
  return (
    server as unknown as {
      viteManifest: Record<string, { file: string }> | null;
    }
  ).viteManifest;
}

function makeServer(): McpServer {
  return new McpServer(
    { name: "test", version: "0.0.1" },
    { capabilities: {} },
  );
}

describe("__setBuildManifest", () => {
  it("primes the Vite manifest for the next McpServer constructed", () => {
    const manifest = {
      "src/views/index.tsx": { file: "assets/index-DEADBEEF.js" },
    };
    __setBuildManifest(manifest);

    // viteManifest is private; reach into it to lock the contract that the
    // generated `dist/__entry.js` relies on.
    expect(manifestOf(makeServer())).toEqual(manifest);
  });

  it("is consume-once: a second McpServer built without re-priming gets no manifest", () => {
    __setBuildManifest({
      "src/views/index.tsx": { file: "assets/index-CAFEBABE.js" },
    });

    makeServer(); // consumes the primed manifest
    expect(manifestOf(makeServer())).toBeNull();
  });
});
