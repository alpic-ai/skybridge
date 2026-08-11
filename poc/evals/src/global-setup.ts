import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import config from "../skybridge.eval.config.js";
import { startServer } from "./server-harness.js";

export default async function setup(project: TestProject) {
  const server = await startServer({
    cwd: fileURLToPath(new URL(`../${config.project.cwd}`, import.meta.url)),
    command: config.project.command,
    env: config.project.env,
  });

  project.provide("mcpUrl", server.url);

  return async () => {
    const output = server.output().trim();
    await server.stop();
    if (output !== "") {
      console.log(`\n--- server output ---\n${output}\n---`);
    }
  };
}

declare module "vitest" {
  interface ProvidedContext {
    mcpUrl: string;
  }
}
