#!/usr/bin/env node

import { init } from "./dist/index.js";

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
