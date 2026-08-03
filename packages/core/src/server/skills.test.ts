// @vitest-environment node
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import {
  discoverSkills,
  registerSkills,
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
        "SKILL.md": "# Refunds",
        "templates/email.md": "Hi",
      },
    },
  ];

  function fakeRegistrar() {
    const resources = new Map<
      string,
      { uri: unknown; cb: (...args: unknown[]) => unknown }
    >();
    const handlers = new Map<string, (req: unknown) => unknown>();
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
        setRequestHandler: vi.fn((schema: unknown, handler: unknown) => {
          const method = (schema as { shape: { method: { value: string } } })
            .shape.method.value;
          handlers.set(method, handler as (req: unknown) => unknown);
        }),
      },
    };
    return { server, resources, handlers };
  }

  it("serves supporting files through the template resource", () => {
    const { server, resources } = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(server as any, manifest);
    const tpl = resources.get("skill-files");
    expect(tpl?.uri).toBeInstanceOf(ResourceTemplate);
    const url = new URL("skill://refunds/templates/email.md");
    const result = tpl?.cb(url, {}, {}) as { contents: { text: string }[] };
    expect(result.contents[0]?.text).toBe("Hi");
  });

  it("lists a subdirectory through the directory-read handler", () => {
    const on = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(on.server as any, manifest);
    const result = on.handlers.get("resources/directory/read")?.({
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
    const { server, handlers } = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(server as any, manifest);
    const result = handlers.get("resources/directory/read")?.({
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

  const digestOf = (content: string) =>
    `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;

  it("lists entries with complete per-file resources via skills/list", () => {
    const { server, handlers } = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(server as any, manifest);
    const result = handlers.get("skills/list")?.({ params: {} });
    expect(result).toEqual({
      skills: [
        {
          uri: "skill://refunds/SKILL.md",
          frontmatter: { name: "refunds", description: "Process refunds" },
          resources: [
            { uri: "skill://refunds/SKILL.md", digest: digestOf("# Refunds") },
            {
              uri: "skill://refunds/templates/email.md",
              digest: digestOf("Hi"),
            },
          ],
        },
      ],
    });
  });

  it("returns a single entry via skills/get and rejects non-skill URIs", () => {
    const { server, handlers } = fakeRegistrar();
    // biome-ignore lint/suspicious/noExplicitAny: structural test double
    registerSkills(server as any, manifest);
    const get = handlers.get("skills/get");
    const result = get?.({
      params: { uri: "skill://refunds/SKILL.md" },
    }) as { skill: { uri: string; resources: unknown[] } };
    expect(result.skill.uri).toBe("skill://refunds/SKILL.md");
    expect(result.skill.resources).toHaveLength(2);
    expect(() =>
      get?.({ params: { uri: "skill://unknown/SKILL.md" } }),
    ).toThrow(/Unknown skill/);
    expect(() =>
      get?.({ params: { uri: "skill://refunds/templates/email.md" } }),
    ).toThrow(/Unknown skill/);
  });
});

describe("discoverSkills symlink safety", () => {
  it("excludes symlinked files and directories from the manifest", () => {
    const outside = mkdtempSync(join(tmpdir(), "skybridge-outside-"));
    writeFileSync(join(outside, "secret.md"), "TOP SECRET");
    const dir = mkSkillDir({
      "demo/SKILL.md": FM("demo", "d"),
      "demo/real.md": "ok",
    });
    symlinkSync(join(outside, "secret.md"), join(dir, "demo", "leak.md"));
    symlinkSync(outside, join(dir, "demo", "escape"));

    const files = discoverSkills(dir)[0]?.files ?? {};
    expect(Object.keys(files).sort()).toEqual(["SKILL.md", "real.md"]);
  });

  it("ignores non-markdown supporting files", () => {
    const dir = mkSkillDir({
      "demo/SKILL.md": FM("demo", "d"),
      "demo/notes.md": "kept",
      "demo/data.json": "{}",
      "demo/scripts/run.py": "print(1)",
    });
    const files = discoverSkills(dir)[0]?.files ?? {};
    expect(Object.keys(files).sort()).toEqual(["SKILL.md", "notes.md"]);
  });
});
