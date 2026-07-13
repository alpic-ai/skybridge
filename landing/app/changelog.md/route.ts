import {
  cleanBodyForMarkdown,
  formatDate,
  getReleases,
  splitChanges,
} from "../changelog/lib";

export const dynamic = "force-static";

export async function GET() {
  const releases = await getReleases();
  const sections = releases.map((release) => {
    const date = formatDate(release.published_at);
    const title =
      release.name && release.name !== release.tag_name ? release.name : null;
    const heading = title
      ? `## ${release.tag_name}: ${title}${date ? ` (${date})` : ""}`
      : `## ${release.tag_name}${date ? ` (${date})` : ""}`;
    const body = release.body ? cleanBodyForMarkdown(release.body).trim() : "";
    const patches = (release.patches ?? []).map((patch) => {
      const patchDate = formatDate(patch.published_at);
      const patchHeading = `### ${patch.tag_name}${patchDate ? ` (${patchDate})` : ""}`;
      const patchBody = patch.body
        ? cleanBodyForMarkdown(splitChanges(patch.body).intro).trim()
        : "";
      return patchBody ? `${patchHeading}\n\n${patchBody}` : patchHeading;
    });
    return [body ? `${heading}\n\n${body}` : heading, ...patches].join("\n\n");
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
