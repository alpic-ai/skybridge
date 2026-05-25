export const dynamic = "force-static";

const BODY = `# Skybridge

> Open-source TypeScript framework for building MCP Apps that run in Claude, ChatGPT, VSCode, and any MCP client. Write one server and view; Skybridge adapts to each host's runtime.

## Docs

- [Documentation](https://docs.skybridge.tech): Full developer docs, guides, and API reference.
- [Changelog](https://skybridge.tech/changelog.md): All releases as plain markdown.
- [Showcase](https://skybridge.tech/showcase): MCP Apps built with Skybridge, shipping in ChatGPT and Claude.

## Source

- [GitHub repository](https://github.com/alpic-ai/skybridge)
- [npm package](https://www.npmjs.com/package/skybridge)
`;

export async function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
