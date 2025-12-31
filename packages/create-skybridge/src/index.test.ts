import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "vitest";
import { init } from "./index.js";

describe("create-skybridge", () => {
  let tempDirName: string;

  beforeEach(() => {
    tempDirName = `test-${randomBytes(2).toString("hex")}`;
  });

  afterEach(async () => {
    await fs.rm(path.join(process.cwd(), tempDirName), {
      recursive: true,
      force: true,
    });
  });

  it("should scaffold a new project", async () => {
    const name = `../../${tempDirName}//project$`;
    await init([name]);
    await fs.access(
      path.join(process.cwd(), tempDirName, "project", ".gitignore"),
    );
  });
});
