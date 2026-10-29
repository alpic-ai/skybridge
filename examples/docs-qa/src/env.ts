import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

try {
  Object.assign(
    process.env,
    parseEnv(readFileSync(resolve(process.cwd(), ".env"), "utf8")),
  );
} catch {
  // no env file
}
