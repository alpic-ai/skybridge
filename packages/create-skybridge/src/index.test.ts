import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { default: realSpawn } =
  await vi.importActual<typeof import("cross-spawn")>("cross-spawn");
vi.mock("cross-spawn", () => ({
  default: vi.fn((command: string, ...rest: unknown[]) => {
    if (command === "tar") {
      return (realSpawn as (...args: unknown[]) => unknown)(command, ...rest);
    }
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

  it("writes pnpm-workspace.yaml allowing esbuild builds when using pnpm", async () => {
    const name = `${tempDirName}/project`;
    await init([name, "--yes", "--skip-skills", "--pm", "pnpm"]);

    const workspaceRaw = await fs.readFile(
      path.join(process.cwd(), tempDirName, "project", "pnpm-workspace.yaml"),
      "utf-8",
    );
    expect(workspaceRaw).toContain('packages:\n  - "."');
    expect(workspaceRaw).toContain("onlyBuiltDependencies:\n  - esbuild");
    expect(workspaceRaw).toContain("allowBuilds:\n  esbuild: true");
  });

  it("does not write pnpm-workspace.yaml for other package managers", async () => {
    const name = `${tempDirName}/project`;
    await init([name, "--yes", "--skip-skills", "--pm", "npm"]);

    await expect(
      fs.access(
        path.join(process.cwd(), tempDirName, "project", "pnpm-workspace.yaml"),
      ),
    ).rejects.toThrow();
  });

  describe("--example", () => {
    let tarball: Buffer;

    beforeAll(async () => {
      const repo = await fs.mkdtemp(path.join(os.tmpdir(), "sky-repo-"));
      const example = path.join(repo, "skybridge-main", "examples", "coffee");
      await fs.mkdir(path.join(example, "src"), { recursive: true });
      await fs.writeFile(
        path.join(example, "package.json"),
        '{"name":"skybridge-coffee-example"}',
      );
      await fs.writeFile(path.join(example, "src", "server.ts"), "");
      execFileSync("tar", ["-czf", "repo.tgz", "skybridge-main"], {
        cwd: repo,
      });
      tarball = await fs.readFile(path.join(repo, "repo.tgz"));
      await fs.rm(repo, { recursive: true, force: true });
    });

    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(tarball)),
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("scaffolds a repo example from the GitHub tarball", async () => {
      const name = `${tempDirName}/coffee-app`;
      await init([name, "--yes", "--skip-skills", "--example", "coffee"]);

      const projectDir = path.join(process.cwd(), tempDirName, "coffee-app");
      await fs.access(path.join(projectDir, "src", "server.ts"));
      const gitignore = await fs.readFile(
        path.join(projectDir, ".gitignore"),
        "utf-8",
      );
      expect(gitignore).toContain("node_modules");
      const pkgRaw = await fs.readFile(
        path.join(projectDir, "package.json"),
        "utf-8",
      );
      expect(JSON.parse(pkgRaw).name).toBe("coffee-app");
    });

    it("rejects an unknown example with the available names", async () => {
      const exit = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("exit");
      }) as never);
      const errors: string[] = [];
      vi.spyOn(console, "error").mockImplementation((msg) => {
        errors.push(String(msg));
      });
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: unknown,
      ) => {
        errors.push(String(chunk));
        return true;
      }) as never);

      await expect(
        init([
          `${tempDirName}/x`,
          "--yes",
          "--skip-skills",
          "--example",
          "nope",
        ]),
      ).rejects.toThrow("exit");

      expect(exit).toHaveBeenCalledWith(1);
      expect(errors.join("\n")).toContain('Unknown example "nope"');
      expect(errors.join("\n")).toContain("coffee");
    });

    it("refuses --example combined with a bundled template", async () => {
      vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("exit");
      }) as never);
      await expect(
        init([`${tempDirName}/x`, "--yes", "--blank", "--example", "coffee"]),
      ).rejects.toThrow("exit");
    });
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
