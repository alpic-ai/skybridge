// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCommandSteps } from "./build-steps.js";

function mkTmp(prefix = "skybridge-build-steps-") {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

describe("getCommandSteps", () => {
  it("omits the vite build step when no views are registered", async () => {
    const root = mkTmp();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "vite.config.ts"),
      `import { defineConfig } from "vite";
import { skybridge } from "skybridge/vite";
export default defineConfig({ plugins: [skybridge()] });`,
    );
    writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { strict: true } }),
    );

    const steps = await getCommandSteps(root);
    const labels = steps.map((step) => step.label);

    expect(labels).not.toContain("Building views");
    expect(labels).toContain("Emitting manifest module");
    expect(labels.at(-1)).toBe("Emitting Vercel build output");
  });

  it("includes the vite build step when views are present", async () => {
    const root = mkTmp();
    mkdirSync(path.join(root, "src", "views"), { recursive: true });
    writeFileSync(
      path.join(root, "src", "views", "hello.tsx"),
      "export default function Hello() { return null; }\n",
    );
    writeFileSync(
      path.join(root, "vite.config.ts"),
      `import { defineConfig } from "vite";
import { skybridge } from "skybridge/vite";
export default defineConfig({ plugins: [skybridge()] });`,
    );
    writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { strict: true } }),
    );

    const steps = await getCommandSteps(root);
    const labels = steps.map((step) => step.label);

    expect(labels).toContain("Building views");
  });

  it("emits an empty manifest module when there are no views", async () => {
    const root = mkTmp();
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(
      path.join(root, "vite.config.ts"),
      `import { defineConfig } from "vite";
import { skybridge } from "skybridge/vite";
export default defineConfig({ plugins: [skybridge()] });`,
    );

    const steps = await getCommandSteps(root);
    const emitManifest = steps.find(
      (step) => step.label === "Emitting manifest module",
    );
    expect(emitManifest?.run).toBeDefined();

    mkdirSync(path.join(root, "dist"), { recursive: true });
    await emitManifest?.run?.();

    const manifestOut = path.join(root, "dist", "vite-manifest.js");
    expect(existsSync(manifestOut)).toBe(true);
    expect(readFileSync(manifestOut, "utf-8")).toBe("export default {};\n");
  });
});
