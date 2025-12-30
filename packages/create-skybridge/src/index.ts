import type { SpawnOptions } from "node:child_process";
import { spawnSync } from "node:child_process";
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
const TEMPLATE_REPO = "https://github.com/alpic-ai/apps-sdk-template";
const defaultProjectName = "skybridge-project";

// prettier-ignore
const helpMessage = `\
Usage: create-skybridge [OPTION]... [DIRECTORY]

Create a new Skybridge project by cloning the starter template.

Options:
  -h, --help              show this help message
  --overwrite             remove existing files in target directory

Examples:
  create-skybridge my-app
  create-skybridge . --overwrite
`;

function run([command, ...args]: string[], options?: SpawnOptions) {
  if (!command) {
    throw new Error("Command is required");
  }
  const { status, error } = spawnSync(command, args, options);
  if (status != null && status > 0) {
    process.exit(status);
  }

  if (error) {
    console.error(`\n${command} ${args.join(" ")} error!`);
    console.error(error);
    process.exit(1);
  }
}

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

  // 3. Clone the repository
  prompts.log.step(`Cloning template from ${TEMPLATE_REPO}...`);

  try {
    // Clone directly to target directory
    run(["git", "clone", "--depth", "1", TEMPLATE_REPO, root], {
      stdio: "inherit",
    });

    // Remove .git directory to start fresh
    const gitDir = path.join(root, ".git");
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }

    prompts.log.success(`Project created in ${root}`);
    prompts.outro(
      `Done! Next steps:\n\n  cd ${targetDir}\n  pnpm install\n  pnpm dev`,
    );
  } catch (error) {
    prompts.log.error("Failed to clone repository");
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
