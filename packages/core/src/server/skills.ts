import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ReadResourceCallback,
  ReadResourceTemplateCallback,
  ResourceMetadata,
  McpServer as SdkMcpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { lookup as lookupMimeType } from "mrmime";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

/**
 * Skills over MCP — the Skills Extension ([SEP-2640](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640), experimental).
 * All spec-facing logic is kept in this one module so churn in the in-review
 * SEP stays a single-file change.
 */

export const SKILLS_EXTENSION_KEY = "io.modelcontextprotocol/skills";
export const SKILL_INDEX_URI = "skill://index.json";

const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Only the fields the extension depends on are validated; `.loose()` keeps any
// other frontmatter, which the index echoes verbatim.
const SkillFrontmatterSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(
        SKILL_NAME_RE,
        "must be lowercase alphanumeric words separated by single hyphens",
      ),
    description: z.string().min(1).max(1024),
  })
  .loose();

export interface SkillFile {
  text: string;
  mimeType: string;
}

export interface Skill {
  name: string;
  frontmatter: Record<string, unknown>;
  /** `sha256:<hex>` over the raw `SKILL.md` bytes. */
  digest: string;
  /** Keyed by POSIX path relative to the skill directory, including `SKILL.md`. */
  files: Record<string, SkillFile>;
}

export type SkillsManifest = Skill[];

// Skills are read as UTF-8 text, so unknown extensions fall back to text/plain.
const mimeTypeForFile = (name: string): string =>
  lookupMimeType(name) ?? "text/plain";

const sha256 = (content: string): string =>
  `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;

const FRONTMATTER_RE = /^﻿?\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function parseFrontmatter(
  content: string,
  source: string,
): Record<string, unknown> {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    throw new Error(`Skill ${source} is missing YAML frontmatter`);
  }
  let data: unknown;
  try {
    data = parseYaml(match[1] ?? "");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot parse frontmatter of ${source}: ${detail}`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Frontmatter of ${source} must be a YAML mapping`);
  }
  return data as Record<string, unknown>;
}

const readSkillDir = (root: string, rel = ""): Record<string, SkillFile> => {
  const files: Record<string, SkillFile> = {};
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    // Skip symlinks so a link can't pull content from outside the skills tree
    // into the served manifest.
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      Object.assign(files, readSkillDir(root, childRel));
    } else if (entry.isFile()) {
      files[childRel] = {
        text: readFileSync(join(root, childRel), "utf8"),
        mimeType: mimeTypeForFile(entry.name),
      };
    }
  }
  return files;
};

// Each immediate subdirectory with a `SKILL.md` is one skill; its directory name
// must equal the frontmatter `name`. Throws on any invalid skill so the
// build/dev startup fails loudly instead of silently skipping.
export function discoverSkills(dir: string): SkillsManifest {
  if (!existsSync(dir)) {
    return [];
  }

  const skills: SkillsManifest = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillRoot = join(dir, entry.name);
    const skillMdPath = join(skillRoot, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      continue;
    }

    const skillMd = readFileSync(skillMdPath, "utf8");
    const source = `${entry.name}/SKILL.md`;
    const raw = parseFrontmatter(skillMd, source);

    const parsed = SkillFrontmatterSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid skill frontmatter in ${source}: ${z.prettifyError(parsed.error)}`,
      );
    }
    if (parsed.data.name !== entry.name) {
      throw new Error(
        `Skill name "${parsed.data.name}" in ${source} must match its directory name "${entry.name}"`,
      );
    }

    skills.push({
      name: entry.name,
      frontmatter: raw,
      digest: sha256(skillMd),
      files: readSkillDir(skillRoot),
    });
  }
  return skills;
}

// Parses a `skill://<name>/<subpath>` URI and rejects `..`/`.` traversal.
export function skillUriToRelPath(uri: string): {
  name: string;
  relPath: string;
} {
  const match = /^skill:\/\/([^/]+)(?:\/(.*))?$/.exec(uri.replace(/\/+$/, ""));
  if (!match) {
    throw new McpError(ErrorCode.InvalidParams, `Invalid skill uri: ${uri}`);
  }
  const [, name = "", relPath = ""] = match;
  const segments = relPath.split("/").filter(Boolean);
  if (name === "" || segments.includes("..") || segments.includes(".")) {
    throw new McpError(ErrorCode.InvalidParams, `Invalid skill uri: ${uri}`);
  }
  return { name, relPath: segments.join("/") };
}

// Read access over a manifest — the shape `registerSkills` serves from. Both
// runtime modes produce a manifest first (prod injects it, dev discovers it at
// startup), so there is a single accessor. `null` means the path is absent.
interface SkillsAccessor {
  readFile(name: string, relPath: string): SkillFile | null;
  readDir(
    name: string,
    relPath: string,
  ): { name: string; mimeType: string }[] | null;
}

function accessor(manifest: SkillsManifest): SkillsAccessor {
  const byName = new Map(manifest.map((s) => [s.name, s]));
  return {
    readFile: (name, relPath) => byName.get(name)?.files[relPath] ?? null,
    readDir: (name, relPath) => {
      const skill = byName.get(name);
      if (!skill) {
        return null;
      }
      const prefix = relPath === "" ? "" : `${relPath}/`;
      const children = new Map<string, string>();
      let matched = relPath === "";
      for (const filePath of Object.keys(skill.files)) {
        if (!filePath.startsWith(prefix)) {
          continue;
        }
        matched = true;
        const rest = filePath.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (slash === -1) {
          children.set(rest, mimeTypeForFile(rest));
        } else {
          children.set(rest.slice(0, slash), "inode/directory");
        }
      }
      if (!matched) {
        return null;
      }
      return [...children].map(([name, mimeType]) => ({ name, mimeType }));
    },
  };
}

/** The subset of `McpServer` that skill registration needs. */
interface SkillRegistrar {
  registerResource(
    name: string,
    uri: string,
    config: ResourceMetadata,
    readCallback: ReadResourceCallback,
  ): unknown;
  registerResource(
    name: string,
    template: ResourceTemplate,
    config: ResourceMetadata,
    readCallback: ReadResourceTemplateCallback,
  ): unknown;
  readonly server: SdkMcpServer["server"];
}

const DirectoryReadRequestSchema = z.object({
  method: z.literal("resources/directory/read"),
  params: z.object({ uri: z.string(), cursor: z.string().optional() }),
});

// Registers per SEP-2640: one resource per `SKILL.md`, a template for supporting
// files, the `skill://index.json` index, and optionally `resources/directory/read`.
export function registerSkills(
  server: SkillRegistrar,
  manifest: SkillsManifest,
  { directoryRead }: { directoryRead: boolean },
): void {
  const source = accessor(manifest);
  const serveFile = (name: string, relPath: string, href: string) => {
    const file = source.readFile(name, relPath);
    if (!file) {
      throw new McpError(ErrorCode.InvalidParams, `Not found: ${href}`);
    }
    return {
      contents: [{ uri: href, text: file.text, mimeType: file.mimeType }],
    };
  };

  for (const skill of manifest) {
    server.registerResource(
      skill.name,
      `skill://${skill.name}/SKILL.md`,
      {
        description: String(skill.frontmatter.description),
        mimeType: "text/markdown",
      },
      (readUri) => serveFile(skill.name, "SKILL.md", readUri.href),
    );
  }

  server.registerResource(
    "skill-files",
    new ResourceTemplate("skill://{skillName}/{+filePath}", {
      list: undefined,
    }),
    {},
    (readUri) => {
      const { name, relPath } = skillUriToRelPath(readUri.href);
      return serveFile(name, relPath, readUri.href);
    },
  );

  server.registerResource(
    "skill-index",
    SKILL_INDEX_URI,
    { mimeType: "application/json" },
    () => ({
      contents: [
        {
          uri: SKILL_INDEX_URI,
          mimeType: "application/json",
          text: JSON.stringify({
            skills: manifest.map((skill) => ({
              url: `skill://${skill.name}/SKILL.md`,
              digest: skill.digest,
              frontmatter: skill.frontmatter,
            })),
          }),
        },
      ],
    }),
  );

  if (directoryRead) {
    server.server.setRequestHandler(
      DirectoryReadRequestSchema,
      ({ params }) => {
        const { name, relPath } = skillUriToRelPath(params.uri);
        const entries = source.readDir(name, relPath);
        if (!entries) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Not a directory: ${params.uri}`,
          );
        }
        const base = params.uri.replace(/\/+$/, "");
        return {
          resources: entries.map((entry) => ({
            uri: `${base}/${entry.name}`,
            name: entry.name,
            mimeType: entry.mimeType,
          })),
        };
      },
    );
  }
}
