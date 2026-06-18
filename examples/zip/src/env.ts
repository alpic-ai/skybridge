import { existsSync } from "node:fs";
import { resolve } from "node:path";

// `skybridge dev` (tsx) and `skybridge start` (node) don't source `.env`
// automatically. Load it here so secrets like the R2 config are present
// before any other module reads `process.env`. Import this first in the
// server entry so it runs before those modules' top-level reads.
const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
