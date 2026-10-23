import type { McpMiddlewareFn } from "skybridge/server";
import type { InputFiles } from "../input-files.js";

export function createResolveFilesMiddleware(
  files: InputFiles,
  fileParams: Map<string, string[]>,
  inputs: Map<string, Record<string, unknown>>,
): McpMiddlewareFn {
  return async (request, _extra, next) => {
    const params = request.params;
    const args = await files.rewrite(
      (params.arguments ?? {}) as Record<string, unknown>,
      fileParams.get(params.name as string) ?? [],
    );
    params.arguments = args;
    const callId = (params._meta as Record<string, unknown> | undefined)?.[
      "skybridge/evalToolCallId"
    ];
    if (typeof callId === "string") {
      inputs.set(callId, args);
    }
    return next();
  };
}
