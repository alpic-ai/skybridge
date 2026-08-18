import { afterEach } from "vitest";
import "./matchers.js";
import { closeOpenedSessions } from "./session-registry.js";

afterEach(async () => {
  await closeOpenedSessions();
});
