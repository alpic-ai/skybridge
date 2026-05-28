import { describe, expect, it } from "vitest";
import { __setBuildManifest, McpServer } from "./index.js";

describe("__setBuildManifest", () => {
  it("primes the Vite manifest for the next McpServer constructed", () => {
    const manifest = {
      "src/views/index.tsx": { file: "assets/index-DEADBEEF.js" },
    };
    __setBuildManifest(manifest);

    const server = new McpServer(
      { name: "test", version: "0.0.1" },
      { capabilities: {} },
    );

    // viteManifest is private; reach into it to lock the contract that the
    // generated `dist/__entry.js` relies on.
    const installed = (
      server as unknown as {
        viteManifest: Record<string, { file: string }> | null;
      }
    ).viteManifest;
    expect(installed).toEqual(manifest);
  });
});
