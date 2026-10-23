import { InputFiles } from "./input-files.js";
import { createListToolsMiddleware } from "./middleware/list-tools.js";
import { createResolveFilesMiddleware } from "./middleware/resolve-files.js";
import { createStubToolMiddleware } from "./middleware/stub-tool.js";
import type { ToolStubs } from "./session-registry.js";

export function createEvalMiddlewares(stubs: ToolStubs = {}) {
  const files = new InputFiles();
  const inputs = new Map<string, Record<string, unknown>>();
  const fileParams = new Map<string, string[]>();

  return {
    files,
    inputs,
    fileParams,
    listTools: createListToolsMiddleware(fileParams, stubs),
    resolveFiles: createResolveFilesMiddleware(files, fileParams, inputs),
    stubTool: createStubToolMiddleware(stubs),
  };
}

export type EvalMiddlewares = ReturnType<typeof createEvalMiddlewares>;
