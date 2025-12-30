import fs from "node:fs";
import path from "node:path";
import * as prompts from "@clack/prompts";
import mri from "mri";

const argv = mri<{
  help?: boolean;
  overwrite?: boolean;
}>(process.argv.slice(2), {
  boolean: ["help", "overwrite"],
  alias: { h: "help" },
});

const cwd = process.cwd();
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

async function init() {
  const argTargetDir = argv._[0]
    ? formatTargetDir(String(argv._[0]))
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
          return value.length === 0 || formatTargetDir(value).length > 0
            ? undefined
            : "Invalid project name";
        },
      });
      if (prompts.isCancel(projectName)) return cancel();
      targetDir = formatTargetDir(projectName);
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

  const root = path.join(cwd, targetDir);

  // 3. Copy the repository
  prompts.log.step(`Copying template...`);

  try {
    const templateDir = new URL("../template", import.meta.url).pathname;
    // Copy template to target directory
    fs.cpSync(templateDir, root, { recursive: true });
    // Rename _gitignore to .gitignore
    fs.renameSync(path.join(root, "_gitignore"), path.join(root, ".gitignore"));
    // Update project name in package.json
    const pkgPath = path.join(root, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    pkg.name = path.basename(root);
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

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

function formatTargetDir(targetDir: string) {
  return targetDir.trim().replace(/\/+$/g, "");
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

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
