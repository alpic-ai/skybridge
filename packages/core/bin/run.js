#!/usr/bin/env node

import { execute } from "@oclif/core";

if (
  process.argv.length === 2 ||
  (process.argv.length >= 3 && process.argv[2]?.startsWith("-"))
) {
  process.argv.splice(2, 0, "dev");
}

await execute({ dir: import.meta.url });
