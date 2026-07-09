// @vitest-environment node
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import {
  discoverSkills,
  diskSource,
  manifestSource,
  registerSkills,
  SKILL_INDEX_URI,
  type Skill,
  skillUriToRelPath,
} from "./skills.js";

function mkSkillDir(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "skybridge-skills-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

const FM = (name: string, description: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n`;

describe("discoverSkills", () => {
  it("discovers a skill with frontmatter, digest, and supporting files", () => {
    const dir = mkSkillDir({
      "git-workflow/SKILL.md": `${FM("git-workflow", "Team git conventions")}Body`,
      "git-workflow/references/GUIDE.md": "# Guide",
    });
    const [skill, ...rest] = discoverSkills(dir);
    expect(rest).toHaveLength(0);
    expect(skill?.name).toBe("git-workflow");
    expect(skill?.frontmatter).toMatchObject({
      name: "git-workflow",
      description: "Team git conventions",
    });
    expect(skill?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(Object.keys(skill?.files ?? {}).sort()).toEqual([
      "SKILL.md",
      "references/GUIDE.md",
    ]);
  });

  it("returns [] for a missing directory and skips dirs without SKILL.md", () => {
    expect(discoverSkills(join(tmpdir(), "does-not-exist-xyz"))).toEqual([]);
    const dir = mkSkillDir({ "not-a-skill/README.md": "hi" });
    expect(discoverSkills(dir)).toEqual([]);
  });

  it("parses a nested metadata map in frontmatter", () => {
    const dir = mkSkillDir({
      "s/SKILL.md": `---\nname: s\ndescription: d\nmetadata:\n  version: "1.2"\n  team: core\n---\n`,
    });
    expect(discoverSkills(dir)[0]?.frontmatter.metadata).toEqual({
      version: "1.2",
      team: "core",
    });
  });

  it("throws on missing frontmatter", () => {
    const dir = mkSkillDir({ "s/SKILL.md": "no frontmatter here" });
    expect(() => discoverSkills(dir)).toThrow(/missing YAML frontmatter/);
  });

  it("throws when required fields are absent", () => {
    const dir = mkSkillDir({ "s/SKILL.md": "---\nname: s\n---\n" });
    expect(() => discoverSkills(dir)).toThrow(/Invalid skill frontmatter/);
  });

  it("throws when the frontmatter name does not match the directory", () => {
    const dir = mkSkillDir({ "s/SKILL.md": FM("other", "d") });
    expect(() => discoverSkills(dir)).toThrow(/must match its directory name/);
  });

  it("preserves arbitrary YAML frontmatter (arrays, nesting) verbatim", () => {
    const dir = mkSkillDir({
      "s/SKILL.md":
        "---\nname: s\ndescription: d\nallowed-tools:\n  - get-order\n  - refund\n---\n",
    });
    expect(discoverSkills(dir)[0]?.frontmatter["allowed-tools"]).toEqual([
      "get-order",
      "refund",
    ]);
  });

  it("throws on malformed YAML frontmatter", () => {
    const dir = mkSkillDir({
      "s/SKILL.md": "---\nname: 's\ndescription: [unclosed\n---\n",
    });
    expect(() => discoverSkills(dir)).toThrow(/Cannot parse frontmatter/);
  });
});

describe("skillUriToRelPath", () => {
  it("splits name and relative path", () => {
    expect(skillUriToRelPath("skill://refunds/SKILL.md")).toEqual({
      name: "refunds",
      relPath: "SKILL.md",
    });
    expect(skillUriToRelPath("skill://refunds")).toEqual({
      name: "refunds",
      relPath: "",
    });
  });

  it("rejects path traversal and malformed URIs", () => {
    expect(() => skillUriToRelPath("skill://s/../../etc/passwd")).toThrow();
    expect(() => skillUriToRelPath("skill://s/./x")).toThrow();
    expect(() => skillUriToRelPath("https://example.com")).toThrow();
  });
});

describe("registerSkills", () => {
  const manifest: Skill[] = [
    {
      name: "refunds",
      frontmatter: { name: "refunds", description: "Process refunds" },
      digest: "sha256:abc",
      files: {
        "SKILL.md": { text: "# Refunds", mimeType: "text/markdown" },
        "templates/email.md": { text: "Hi", mimeType: "text/markdown" },
      },
    },
  ];

  function fakeRegistrar() {
    const resources = new Map<
      string,
      { uri: unknown; cb: (...args: unknown[]) => unknown }
    >();
    let dirHandler: ((req: unknown) => unknown) | undefined;
    const server = {
      registerResource: vi.fn(
        (name: string, uri: unknown, _cfg: unknown, cb: unknown) => {
          resources.set(name, {
            uri,
            cb: cb as (...args: unknown[]) => unknown,
          });
        },
      ),
      server: {
        setRequestHandler: vi.fn((_schema: unknown, handler: unknown) => {
          dirHandler = handler as (req: unknown) => unknown;
        }),
      },
    };
    return { server, resources, getDirHandler: () => dirHandler };
  }

  it("builds an index.json with url, digest, and verbatim frontmatter", () => {
    const { server, resources } = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(server as any, manifestSource(manifest), {
      directoryRead: false,
    });
    const index = resources.get("skill-index");
    const result = index?.cb(new URL(SKILL_INDEX_URI)) as {
      contents: { text: string }[];
    };
    expect(JSON.parse(result.contents[0]?.text ?? "")).toEqual({
      skills: [
        {
          url: "skill://refunds/SKILL.md",
          digest: "sha256:abc",
          frontmatter: { name: "refunds", description: "Process refunds" },
        },
      ],
    });
  });

  it("serves supporting files through the template resource", () => {
    const { server, resources } = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(server as any, manifestSource(manifest), {
      directoryRead: false,
    });
    const tpl = resources.get("skill-files");
    expect(tpl?.uri).toBeInstanceOf(ResourceTemplate);
    const url = new URL("skill://refunds/templates/email.md");
    const result = tpl?.cb(url, {}, {}) as { contents: { text: string }[] };
    expect(result.contents[0]?.text).toBe("Hi");
  });

  it("only registers the directory-read handler when enabled", () => {
    const off = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(off.server as any, manifestSource(manifest), {
      directoryRead: false,
    });
    expect(off.getDirHandler()).toBeUndefined();

    const on = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(on.server as any, manifestSource(manifest), {
      directoryRead: true,
    });
    const result = on.getDirHandler()?.({
      params: { uri: "skill://refunds/templates" },
    }) as { resources: { uri: string; name: string; mimeType: string }[] };
    expect(result.resources).toEqual([
      {
        uri: "skill://refunds/templates/email.md",
        name: "email.md",
        mimeType: "text/markdown",
      },
    ]);
  });

  it("lists a skill root and marks subdirectories as inode/directory", () => {
    const { server, getDirHandler } = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(server as any, manifestSource(manifest), {
      directoryRead: true,
    });
    const result = getDirHandler()?.({
      params: { uri: "skill://refunds" },
    }) as { resources: { name: string; mimeType: string }[] };
    expect(result.resources).toContainEqual({
      uri: "skill://refunds/templates",
      name: "templates",
      mimeType: "inode/directory",
    });
    expect(result.resources).toContainEqual({
      uri: "skill://refunds/SKILL.md",
      name: "SKILL.md",
      mimeType: "text/markdown",
    });
  });
});

describe("diskSource", () => {
  it("reads files live and lists directories", () => {
    const dir = mkSkillDir({
      "refunds/SKILL.md": FM("refunds", "d"),
      "refunds/templates/email.md": "Hi",
    });
    const source = diskSource(dir);
    expect(source.list()).toHaveLength(1);
    expect(source.readFile("refunds", "templates/email.md")?.text).toBe("Hi");
    expect(source.readFile("refunds", "missing.md")).toBeNull();
    expect(source.readDir("refunds", "nope")).toBeNull();
  });

  it("refuses to read or list through a symlink that escapes the skills root", () => {
    const outside = mkdtempSync(join(tmpdir(), "skybridge-outside-"));
    writeFileSync(join(outside, "secret.txt"), "TOP SECRET");
    const dir = mkSkillDir({ "demo/SKILL.md": FM("demo", "d") });
    symlinkSync(join(outside, "secret.txt"), join(dir, "demo", "leak.txt"));
    symlinkSync(outside, join(dir, "demo", "escape"));

    const source = diskSource(dir);
    expect(source.readFile("demo", "leak.txt")).toBeNull();
    expect(source.readDir("demo", "escape")).toBeNull();
  });
});
