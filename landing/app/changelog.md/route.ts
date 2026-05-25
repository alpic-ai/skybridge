import { cleanBodyForMarkdown, getReleases } from "../changelog/lib";

export const dynamic = "force-static";

function formatDate(iso: string | null): string {
  if (!iso) {
    return "";
  }
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function GET() {
  const releases = await getReleases();
  const sections = releases.map((release) => {
    const date = formatDate(release.published_at);
    const title =
      release.name && release.name !== release.tag_name ? release.name : null;
    const heading = title
      ? `## ${release.tag_name} — ${title}${date ? ` (${date})` : ""}`
      : `## ${release.tag_name}${date ? ` (${date})` : ""}`;
    const body = release.body ? cleanBodyForMarkdown(release.body).trim() : "";
    return body ? `${heading}\n\n${body}` : heading;
  });
  const md = [
    "# Skybridge changelog",
    "",
    "Open-source TypeScript framework for building MCP Apps that run in Claude, ChatGPT, VSCode, and any MCP client.",
    "",
    "Source: https://github.com/alpic-ai/skybridge/releases",
    "",
    ...sections,
    "",
  ].join("\n");
  return new Response(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
