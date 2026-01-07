import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const examples = [{ name: "ecom", source: "../../examples/ecom-carousel" }];

for (const example of examples) {
  const src = path.resolve(root, example.source);
  const dest = path.join(root, `template-${example.name}`);

  if (!fs.existsSync(src)) {
    console.error(`Example not found: ${src}`);
    process.exit(1);
  }

  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }

  fs.cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      const relativePath = path.relative(src, srcPath);
      return (
        !relativePath.startsWith("node_modules") &&
        !relativePath.startsWith("dist")
      );
    },
  });
}
