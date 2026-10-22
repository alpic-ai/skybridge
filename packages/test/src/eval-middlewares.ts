import type { McpMiddlewareFn } from "skybridge/server";
import { InputFiles } from "./input-files.js";
import { createListToolsMiddleware } from "./middleware/list-tools.js";
import { createResolveFilesMiddleware } from "./middleware/resolve-files.js";
import { createStubToolMiddleware } from "./middleware/stub-tool.js";
import type { ToolStubs } from "./session-registry.js";

export class EvalMiddlewares {
  readonly files = new InputFiles();
  readonly inputs = new Map<string, Record<string, unknown>>();
  readonly fileParams = new Map<string, string[]>();
  readonly listTools: McpMiddlewareFn;
  readonly resolveFiles: McpMiddlewareFn;
  readonly stubTool: McpMiddlewareFn;

  constructor(stubs: ToolStubs = {}) {
    this.listTools = createListToolsMiddleware(this.fileParams, stubs);
    this.resolveFiles = createResolveFilesMiddleware(
      this.files,
      this.fileParams,
      this.inputs,
    );
    this.stubTool = createStubToolMiddleware(stubs);
  }
}
