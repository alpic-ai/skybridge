import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prompts from "@clack/prompts";
import mri from "mri";

const defaultProjectName = "skybridge-project";

// prettier-ignore
const helpMessage = `\
Usage: create-skybridge [OPTION]... [DIRECTORY]

Create a new Skybridge project by copying the starter template.

Options:
  -h, --help              show this help message
  --overwrite             remove existing files in target directory

Examples:
  create-skybridge my-app
  create-skybridge . --overwrite
`;

export async function init(args: string[] = process.argv.slice(2)) {
  const argv = mri<{
    help?: boolean;
    overwrite?: boolean;
  }>(args, {
    boolean: ["help", "overwrite"],
    alias: { h: "help" },
  });

  const argTargetDir = argv._[0]
    ? sanitizeTargetDir(String(argv._[0]))
    : undefined;
  const argOverwrite = argv.overwrite;

  const help = argv.help;
  if (help) {
    console.log(helpMessage);
    return;
  }

  const interactive = process.stdin.isTTY;
  const cancel = () => prompts.cancel("Operation cancelled");

  // 1. Get project name and target dir
  let targetDir = argTargetDir;
  if (!targetDir) {
    if (interactive) {
      const projectName = await prompts.text({
        message: "Project name:",
        defaultValue: defaultProjectName,
        placeholder: defaultProjectName,
        validate: (value: string) => {
          return value.length === 0 || sanitizeTargetDir(value).length > 0
            ? undefined
            : "Invalid project name";
        },
      });
      if (prompts.isCancel(projectName)) return cancel();
      targetDir = sanitizeTargetDir(projectName);
    } else {
      targetDir = defaultProjectName;
    }
  }

  // 2. Handle directory if exist and not empty
  if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
    let overwrite: "yes" | "no" | undefined = argOverwrite ? "yes" : undefined;
    if (!overwrite) {
      if (interactive) {
        const res = await prompts.select({
          message:
            (targetDir === "."
              ? "Current directory"
              : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          options: [
            {
              label: "Cancel operation",
              value: "no",
            },
            {
              label: "Remove existing files and continue",
              value: "yes",
            },
          ],
        });
        if (prompts.isCancel(res)) return cancel();
        overwrite = res;
      } else {
        overwrite = "no";
      }
    }

    switch (overwrite) {
      case "yes":
        emptyDir(targetDir);
        break;
      case "no":
        cancel();
        return;
    }
  }

  const root = path.join(process.cwd(), targetDir);

  // 3. Copy the repository
  prompts.log.step(`Copying template...`);

  try {
    const templateDir = fileURLToPath(new URL("../template", import.meta.url));
    // Copy template to target directory
    fs.cpSync(templateDir, root, {
      recursive: true,
      filter: (src) => !src.endsWith(".npmrc"),
    });
    // Rename _gitignore to .gitignore
    fs.renameSync(path.join(root, "_gitignore"), path.join(root, ".gitignore"));
    // Update project name in package.json
    const name = path.basename(root);
    for (const dir of ["", "server", "web"]) {
      const pkgPath = path.join(root, dir, "package.json");
      const pkg = fs.readFileSync(pkgPath, "utf-8");
      const fixed = pkg.replace(/apps-sdk-template/g, name);
      fs.writeFileSync(pkgPath, fixed);
    }

    prompts.log.success(`Project created in ${root}`);
    prompts.outro(
      `Done! Next steps:\n\n  cd ${targetDir}\n  pnpm install\n  pnpm dev`,
    );
  } catch (error) {
    prompts.log.error("Failed to copy repository");
    console.error(error);
    process.exit(1);
  }
}

function sanitizeTargetDir(targetDir: string) {
  return (
    targetDir
      .trim()
      // Only keep alphanumeric, dash, underscore, dot, @, /
      .replace(/[^a-zA-Z0-9\-_.@/]/g, "")
      // Prevent path traversal
      .replace(/\.\./g, "")
      // Collapse multiple slashes
      .replace(/\/+/g, "/")
      // Remove leading/trailing slashes
      .replace(/^\/+|\/+$/g, "")
  );
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}
