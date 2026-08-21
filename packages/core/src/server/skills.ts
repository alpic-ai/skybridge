import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import {
  INVALID_PARAMS,
  ProtocolError,
  type ReadResourceCallback,
  type ReadResourceTemplateCallback,
  type ResourceMetadata,
  ResourceTemplate,
  type McpServer as SdkMcpServer,
} from "@modelcontextprotocol/server";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export const SKILLS_EXTENSION_KEY = "io.modelcontextprotocol/skills";

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

export interface SkillResource {
  uri: string;
  digest: string;
  content: string;
}

export interface Skill {
  uri: string;
  frontmatter: { name: string; description: string } & Record<string, unknown>;
  resources: SkillResource[];
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
    const files = readSkillDir(skillRoot);
    const skillMd = files["SKILL.md"];
    if (skillMd === undefined) {
      continue;
    }

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

    const resources = Object.entries(files)
      .sort(
        ([a], [b]) =>
          Number(b === "SKILL.md") - Number(a === "SKILL.md") ||
          a.localeCompare(b),
      )
      .map(([relPath, content]) => ({
        uri: `skill://${entry.name}/${relPath}`,
        digest: sha256(content),
        content,
      }));

    skills.push({
      uri: `skill://${entry.name}/SKILL.md`,
      frontmatter: parsed.data,
      resources,
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
    throw new ProtocolError(INVALID_PARAMS, `Invalid skill uri: ${uri}`);
  }
  const [, name = "", relPath = ""] = match;
  const segments = relPath.split("/").filter(Boolean);
  if (name === "" || segments.includes("..") || segments.includes(".")) {
    throw new ProtocolError(INVALID_PARAMS, `Invalid skill uri: ${uri}`);
  }
  return { name, relPath: segments.join("/") };
}

function listDir(
  skill: Skill,
  relPath: string,
): { name: string; mimeType: string }[] | null {
  const prefix = relPath === "" ? "" : `${relPath}/`;
  const base = skill.uri.slice(0, -"SKILL.md".length);
  const children = new Map<string, string>();
  let matched = relPath === "";
  for (const filePath of skill.resources.map((resource) =>
    resource.uri.slice(base.length),
  )) {
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

export interface SkillRegistrar {
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
  readonly server: Pick<SdkMcpServer["server"], "setRequestHandler">;
}

const DirectoryReadParamsSchema = z.object({
  uri: z.string(),
  cursor: z.string().optional(),
});

const SkillsListParamsSchema = z
  .object({ cursor: z.string().optional() })
  .optional();

const SkillsGetParamsSchema = z.object({ uri: z.string() });

const toWireEntry = (skill: Skill) => ({
  uri: skill.uri,
  frontmatter: skill.frontmatter,
  resources: skill.resources.map(({ uri, digest }) => ({ uri, digest })),
});

export function registerSkills(
  server: SkillRegistrar,
  manifest: SkillsManifest,
): void {
  const byUri = new Map(manifest.map((skill) => [skill.uri, skill]));
  const serveFile = (skillUri: string, fileUri: string, href: string) => {
    const text = byUri
      .get(skillUri)
      ?.resources.find((resource) => resource.uri === fileUri)?.content;
    if (text === undefined) {
      throw new ProtocolError(INVALID_PARAMS, `Not found: ${href}`);
    }
    return {
      contents: [{ uri: href, text, mimeType: "text/markdown" }],
    };
  };

  for (const skill of manifest) {
    server.registerResource(
      skill.frontmatter.name,
      skill.uri,
      {
        description: skill.frontmatter.description,
        mimeType: "text/markdown",
      },
      (readUri) => serveFile(skill.uri, skill.uri, readUri.href),
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
      return serveFile(
        `skill://${name}/SKILL.md`,
        `skill://${name}/${relPath}`,
        readUri.href,
      );
    },
  );

  server.server.setRequestHandler(
    "skills/list",
    { params: SkillsListParamsSchema },
    () => ({ skills: manifest.map(toWireEntry) }),
  );

  server.server.setRequestHandler(
    "skills/get",
    { params: SkillsGetParamsSchema },
    (params) => {
      const skill = byUri.get(params.uri);
      if (!skill) {
        throw new ProtocolError(INVALID_PARAMS, `Unknown skill: ${params.uri}`);
      }
      return { skill: toWireEntry(skill) };
    },
  );

  server.server.setRequestHandler(
    "resources/directory/read",
    { params: DirectoryReadParamsSchema },
    (params) => {
      const { name, relPath } = skillUriToRelPath(params.uri);
      const skill = byUri.get(`skill://${name}/SKILL.md`);
      const entries = skill ? listDir(skill, relPath) : null;
      if (!entries) {
        throw new ProtocolError(
          INVALID_PARAMS,
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
