import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type {
  ReadResourceCallback,
  ReadResourceTemplateCallback,
  ResourceMetadata,
  McpServer as SdkMcpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export const SKILLS_EXTENSION_KEY = "io.modelcontextprotocol/skills";
export const SKILL_INDEX_URI = "skill://index.json";

const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

export interface Skill {
  name: string;
  frontmatter: Record<string, unknown>;
  digest: string;
  files: Record<string, string>;
}

export type SkillsManifest = Skill[];

const sha256 = (content: string): string =>
  `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;

const FRONTMATTER_RE = /^﻿?\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function parseFrontmatter(content: string, source: string): unknown {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    throw new Error(`Skill ${source} is missing YAML frontmatter`);
  }
  try {
    return parseYaml(match[1] ?? "");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot parse frontmatter of ${source}: ${detail}`);
  }
}

const readSkillDir = (root: string, rel = ""): Record<string, string> => {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      Object.assign(files, readSkillDir(root, childRel));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      files[childRel] = readFileSync(join(root, childRel), "utf8");
    }
  }
  return files;
};

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

    const parsed = SkillFrontmatterSchema.safeParse(
      parseFrontmatter(skillMd, source),
    );
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
      frontmatter: parsed.data,
      digest: sha256(skillMd),
      files: readSkillDir(skillRoot),
    });
  }
  return skills;
}

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

function listDir(
  skill: Skill,
  relPath: string,
): { name: string; mimeType: string }[] | null {
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
      children.set(rest, "text/markdown");
    } else {
      children.set(rest.slice(0, slash), "inode/directory");
    }
  }
  if (!matched) {
    return null;
  }
  return [...children].map(([name, mimeType]) => ({ name, mimeType }));
}

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

export function registerSkills(
  server: SkillRegistrar,
  manifest: SkillsManifest,
): void {
  const byName = new Map(manifest.map((s) => [s.name, s]));
  const serveFile = (name: string, relPath: string, href: string) => {
    const text = byName.get(name)?.files[relPath];
    if (text === undefined) {
      throw new McpError(ErrorCode.InvalidParams, `Not found: ${href}`);
    }
    return {
      contents: [{ uri: href, text, mimeType: "text/markdown" }],
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

  server.server.setRequestHandler(DirectoryReadRequestSchema, ({ params }) => {
    const { name, relPath } = skillUriToRelPath(params.uri);
    const skill = byName.get(name);
    const entries = skill ? listDir(skill, relPath) : null;
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
  });
}
