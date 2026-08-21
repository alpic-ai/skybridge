import type { TestProject } from "vitest/node";
import { startServer } from "./server-harness.js";

export default async function setup(project: TestProject) {
  const options = project.config.provide?.skybridgeEvals;
  if (options === undefined) {
    throw new Error(
      "The evals plugin is not registered. Add `skybridge({ evals: {...} })` to the vitest config.",
    );
  }

  if (options.server !== undefined) {
    project.provide("skybridgeEvalsUrl", options.server);
    return;
  }
  if (options.project === undefined) {
    throw new Error("The evals plugin needs either `server` or `project`");
  }

  const server = await startServer(options.project);
  project.provide("skybridgeEvalsUrl", server.url);

  return async () => {
    const output = server.output().trim();
    await server.stop();
    if (output !== "") {
      console.log(`\n--- server output ---\n${output}\n---`);
    }
  };
}
