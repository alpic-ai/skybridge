import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import {
  __setSkillsManifest,
  McpServer,
  type SkillsManifest,
} from "./index.js";

const MANIFEST: SkillsManifest = [
  {
    name: "demo",
    frontmatter: { name: "demo", description: "A demo skill" },
    digest: "sha256:deadbeef",
    files: { "SKILL.md": { text: "# Demo", mimeType: "text/markdown" } },
  },
];

function extensionsOf(server: McpServer): Record<string, unknown> | undefined {
  return (
    server.server as unknown as {
      _capabilities?: { extensions?: Record<string, unknown> };
    }
  )._capabilities?.extensions;
}

function registeredResourceNames(server: McpServer): string[] {
  const registered = (
    server as unknown as {
      _registeredResources?: Record<string, unknown>;
      _registeredResourceTemplates?: Record<string, unknown>;
    }
  )._registeredResources;
  return registered ? Object.keys(registered) : [];
}

describe("skills server option", () => {
  it("declares the extension capability and registers skill resources from the primed manifest", () => {
    __setSkillsManifest(MANIFEST);
    const server = new McpServer(
      { name: "t", version: "0.0.1" },
      { capabilities: {} },
      { skills: true },
    );

    expect(extensionsOf(server)?.["io.modelcontextprotocol/skills"]).toEqual({
      directoryRead: true,
    });
    // Resources are keyed by URI: the skill's SKILL.md plus the discovery
    // index. Locks that the primed manifest was consumed and wired up.
    expect(registeredResourceNames(server)).toEqual(
      expect.arrayContaining(["skill://demo/SKILL.md", "skill://index.json"]),
    );
  });

  it("does nothing when the skills option is absent", () => {
    __setSkillsManifest(MANIFEST);
    const server = new McpServer({ name: "t", version: "0.0.1" }, {});

    expect(
      extensionsOf(server)?.["io.modelcontextprotocol/skills"],
    ).toBeUndefined();
    expect(registeredResourceNames(server)).not.toContain("skill://index.json");
  });

  it("serves skills through the stateless transport (capability + reads)", async () => {
    __setSkillsManifest(MANIFEST);
    const server = new McpServer(
      { name: "t", version: "0.0.1" },
      {},
      { skills: true },
    );
    const client = new Client({ name: "c", version: "0.0.1" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    // The production HTTP path builds a fresh per-request server and copies
    // handler maps by reference; exercise it directly to lock that skills
    // (capability + resource reads) survive that hop.
    await server.connectStatelessTransport(serverTransport);
    await client.connect(clientTransport);

    expect(
      client.getServerCapabilities()?.extensions?.[
        "io.modelcontextprotocol/skills"
      ],
    ).toEqual({ directoryRead: true });

    const index = await client.readResource({ uri: "skill://index.json" });
    expect((index.contents[0] as { text?: string }).text).toContain(
      "skill://demo/SKILL.md",
    );

    const skill = await client.readResource({ uri: "skill://demo/SKILL.md" });
    expect((skill.contents[0] as { text?: string }).text).toBe("# Demo");

    await client.close();
    await server.close();
  });

  it("warns when skills are enabled but none are found", () => {
    __setSkillsManifest([]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    new McpServer({ name: "t", version: "0.0.1" }, {}, { skills: true });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no skills were found"),
    );
    warn.mockRestore();
  });
});
