import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import type {
  ReadResourceCallback,
  ReadResourceTemplateCallback,
  ResourceMetadata,
  McpServer as SdkMcpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
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

const mimeTypeForFile = (name: string): string => {
  switch (extname(name)) {
    case ".md":
      return "text/markdown";
    case ".json":
      return "application/json";
    default:
      return "text/plain";
  }
};

const sha256 = (content: string): string =>
  `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;

const unquote = (raw: string): string => {
  const v = raw.trim();
  if (
    v.length >= 2 &&
    ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'")))
  ) {
    return v.slice(1, -1);
  }
  return v;
};

// Supports only the frontmatter subset the Agent Skills spec uses — top-level
// scalars plus one level of nested `key: value` maps. Anything else (sequences,
// block scalars, deeper nesting) throws rather than silently mis-parsing, which
// avoids pulling in a full YAML dependency.
function parseFrontmatter(
  content: string,
  source: string,
): Record<string, unknown> {
  const match = /^﻿?\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(
    content,
  );
  if (!match) {
    throw new Error(`Skill ${source} is missing YAML frontmatter`);
  }

  const result: Record<string, unknown> = {};
  let currentMap: Record<string, string> | null = null;

  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    if (line.trim() === "" || line.trim().startsWith("#")) {
      continue;
    }

    if (/^\s/.test(line)) {
      const nested = /^\s+([^:#]+):[ \t]?(.*)$/.exec(line);
      const nestedKey = nested?.[1];
      if (!currentMap || nestedKey === undefined) {
        throw new Error(`Cannot parse frontmatter of ${source} at: "${line}"`);
      }
      currentMap[nestedKey.trim()] = unquote(nested?.[2] ?? "");
      continue;
    }

    const top = /^([^:#\s][^:]*):[ \t]?(.*)$/.exec(line);
    const topKey = top?.[1];
    if (topKey === undefined) {
      throw new Error(`Cannot parse frontmatter of ${source} at: "${line}"`);
    }
    const key = topKey.trim();
    const value = top?.[2] ?? "";
    if (value.trim() === "") {
      currentMap = {};
      result[key] = currentMap;
    } else {
      if (/^[-|>[{]/.test(value.trim())) {
        throw new Error(
          `Unsupported frontmatter value for "${key}" in ${source}: only scalars and simple maps are supported`,
        );
      }
      result[key] = unquote(value);
      currentMap = null;
    }
  }
  return result;
}

const readSkillDir = (root: string, rel = ""): Record<string, SkillFile> => {
  const files: Record<string, SkillFile> = {};
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
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

// The indirection both runtime modes share: an in-memory manifest (production)
// and a live disk reader (dev). `readFile`/`readDir` return null when absent.
export interface SkillsSource {
  list(): Skill[];
  readFile(name: string, relPath: string): SkillFile | null;
  readDir(
    name: string,
    relPath: string,
  ): { name: string; mimeType: string }[] | null;
}

export function manifestSource(manifest: SkillsManifest): SkillsSource {
  const byName = new Map(manifest.map((s) => [s.name, s]));
  const fileKey = (relPath: string) => relPath.replace(/\/+$/, "");

  return {
    list: () => manifest,
    readFile: (name, relPath) => byName.get(name)?.files[relPath] ?? null,
    readDir: (name, relPath) => {
      const skill = byName.get(name);
      if (!skill) {
        return null;
      }
      const prefix = relPath === "" ? "" : `${fileKey(relPath)}/`;
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

export function diskSource(dir: string): SkillsSource {
  const rootReal = existsSync(dir) ? realpathSync(dir) : resolve(dir);

  // Confirms the real (symlink-followed) path stays within the skills root, else
  // null — closes the traversal hole where an in-tree symlink points outside it.
  const contain = (name: string, relPath: string): string | null => {
    const path = join(dir, name, relPath);
    if (!existsSync(path)) {
      return null;
    }
    const real = realpathSync(path);
    return real === rootReal || real.startsWith(`${rootReal}${sep}`)
      ? path
      : null;
  };

  return {
    list: () => discoverSkills(dir),
    readFile: (name, relPath) => {
      const path = contain(name, relPath || "SKILL.md");
      if (!path || !statSync(path).isFile()) {
        return null;
      }
      return {
        text: readFileSync(path, "utf8"),
        mimeType: mimeTypeForFile(path),
      };
    },
    readDir: (name, relPath) => {
      const path = contain(name, relPath);
      if (!path || !statSync(path).isDirectory()) {
        return null;
      }
      return readdirSync(path, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        mimeType: entry.isDirectory()
          ? "inode/directory"
          : mimeTypeForFile(entry.name),
      }));
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
  source: SkillsSource,
  { directoryRead }: { directoryRead: boolean },
): void {
  for (const skill of source.list()) {
    const uri = `skill://${skill.name}/SKILL.md`;
    server.registerResource(
      skill.name,
      uri,
      {
        description:
          typeof skill.frontmatter.description === "string"
            ? skill.frontmatter.description
            : undefined,
        mimeType: "text/markdown",
      },
      (readUri) => {
        const file = source.readFile(skill.name, "SKILL.md");
        if (!file) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Not found: ${readUri.href}`,
          );
        }
        return {
          contents: [
            { uri: readUri.href, text: file.text, mimeType: file.mimeType },
          ],
        };
      },
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
      const file = source.readFile(name, relPath);
      if (!file) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Not found: ${readUri.href}`,
        );
      }
      return {
        contents: [
          { uri: readUri.href, text: file.text, mimeType: file.mimeType },
        ],
      };
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
            skills: source.list().map((skill) => ({
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
