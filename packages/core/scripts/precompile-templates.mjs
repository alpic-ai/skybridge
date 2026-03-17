import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import Handlebars from "handlebars";

const ROOT = join(import.meta.dirname, "..");
const TEMPLATES_SRC = join(ROOT, "src", "server", "templates");
const TEMPLATES_DIST = join(ROOT, "dist", "server", "templates");

const hbsFiles = readdirSync(TEMPLATES_SRC).filter((f) => f.endsWith(".hbs"));

const destinations = [TEMPLATES_SRC];
try {
  mkdirSync(TEMPLATES_DIST, { recursive: true });
  destinations.push(TEMPLATES_DIST);
} catch {}

for (const file of hbsFiles) {
  const source = readFileSync(join(TEMPLATES_SRC, file), "utf-8");
  const precompiled = Handlebars.precompile(source);
  const name = basename(file, ".hbs");

  const output = [
    `import Handlebars from "handlebars/runtime.js";`,
    `export default Handlebars.template(${precompiled});`,
    "",
  ].join("\n");

  for (const dest of destinations) {
    writeFileSync(join(dest, `${name}.js`), output);
  }
}

console.log(`Precompiled ${hbsFiles.length} template(s)`);
