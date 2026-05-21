import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cross-spawn", () => ({
  default: vi.fn(() => {
    const child = new EventEmitter();
    setImmediate(() => child.emit("close", 0));
    return child;
  }),
}));

const { init } = await import("./index.js");

describe("create-skybridge", () => {
  let tempDirName: string;

  beforeEach(() => {
    tempDirName = `test-${randomBytes(2).toString("hex")}`;
  });

  afterEach(async () => {
    await fs.rm(path.join(process.cwd(), tempDirName), {
      recursive: true,
      force: true,
    });
  });

  it("scaffolds the demo template by default", async () => {
    const name = `${tempDirName}/project`;
    await init([name, "--yes", "--skip-skills"]);

    const projectDir = path.join(process.cwd(), tempDirName, "project");
    await fs.access(path.join(projectDir, ".gitignore"));
    await fs.access(path.join(projectDir, ".dockerignore"));
    await fs.access(path.join(projectDir, "Dockerfile"));
    await fs.access(path.join(projectDir, "src", "views"));

    await expect(fs.access(path.join(projectDir, ".npmrc"))).rejects.toThrow();
    await expect(
      fs.access(path.join(projectDir, "_gitignore")),
    ).rejects.toThrow();
  });

  it("scaffolds the blank template with --blank", async () => {
    const name = `${tempDirName}/project`;
    await init([name, "--yes", "--blank", "--skip-skills"]);

    const projectDir = path.join(process.cwd(), tempDirName, "project");
    await fs.access(path.join(projectDir, ".gitignore"));
    await fs.access(path.join(projectDir, "Dockerfile"));
    await fs.access(path.join(projectDir, "src", "server.ts"));

    // Blank template ships no views directory and no demo styles.
    await expect(
      fs.access(path.join(projectDir, "src", "views")),
    ).rejects.toThrow();
    await expect(
      fs.access(path.join(projectDir, "src", "index.css")),
    ).rejects.toThrow();
  });

  it("sets package.json name to the project directory basename", async () => {
    const name = `${tempDirName}/my-app`;
    await init([name, "--yes", "--skip-skills"]);

    const pkgRaw = await fs.readFile(
      path.join(process.cwd(), tempDirName, "my-app", "package.json"),
      "utf-8",
    );
    expect(JSON.parse(pkgRaw).name).toBe("my-app");
  });
});
