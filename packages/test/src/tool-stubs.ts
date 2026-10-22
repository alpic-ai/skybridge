import type { McpServer } from "skybridge/server";
import type { StubMap } from "./chat.js";

export function installToolStubs(
  server: Pick<McpServer, "registerTool" | "mcpMiddleware">,
  stubs: StubMap,
) {
  const names = Object.keys(stubs);
  if (names.length === 0) {
    return;
  }
  server.mcpMiddleware("tools/list", async (_request, _extra, next) => {
    const result = await next();
    const unknown = names.filter(
      (name) => !result.tools.some((tool) => tool.name === name),
    );
    if (unknown.length) {
      throw new Error(
        `the app exposes no tool named ${unknown.map((name) => `"${name}"`).join(", ")}, so the stub would never run`,
      );
    }
    return result;
  });
  const registerTool = server.registerTool.bind(server);
  server.registerTool = ((...args: Parameters<typeof registerTool>) => {
    const [config, handler] = args;
    const stub = Object.hasOwn(stubs, config.name)
      ? stubs[config.name]
      : undefined;
    if (!stub) {
      return registerTool(config, handler);
    }
    return registerTool(config, async (input, extra) => {
      const result = await stub(input);
      return result === undefined
        ? handler(input, extra)
        : {
            content: [
              {
                type: "text",
                text:
                  typeof result === "string" ? result : JSON.stringify(result),
              },
            ],
          };
    });
  }) as typeof server.registerTool;
}
