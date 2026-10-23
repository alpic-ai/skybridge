import type { McpMiddlewareFn } from "skybridge/server";
import type { ToolStubs } from "../session-registry.js";

export function createStubToolMiddleware(stubs: ToolStubs): McpMiddlewareFn {
  return async (request, _extra, next) => {
    const result = await stubs[request.params.name as string]?.(
      (request.params.arguments ?? {}) as Record<string, unknown>,
    );
    return result === undefined
      ? next()
      : {
          content: [
            {
              type: "text",
              text:
                typeof result === "string" ? result : JSON.stringify(result),
            },
          ],
        };
  };
}
