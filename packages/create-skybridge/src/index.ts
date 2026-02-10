import { type SpawnOptions, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prompts from "@clack/prompts";
import { downloadTemplate } from "giget";
import mri from "mri";

const defaultProjectName = "skybridge-project";

// prettier-ignore
const helpMessage = `\
Usage: create-skybridge [OPTION]... [DIRECTORY]

Create a new Skybridge project by copying the starter template.

Options:
  -h, --help              show this help message
  --repo <uri>            use a git repository instead of the built-in template
  --overwrite             remove existing files in target directory
  --immediate             install dependencies and start development server

Repository URI formats:
  github:user/repo
  gitlab:user/repo/subdirectory
  bitbucket:user/repo#branch

Examples:
  create-skybridge my-app
  create-skybridge my-app --repo github:alpic-ai/skybridge/examples/ecom-carousel
  create-skybridge . --overwrite --immediate
`;

export async function init(args: string[] = process.argv.slice(2)) {
  const argv = mri<{
    help?: boolean;
    repo?: string;
    overwrite?: boolean;
    immediate?: boolean;
  }>(args, {
    boolean: ["help", "overwrite", "immediate"],
    string: ["repo"],
    alias: { h: "help" },
  });

  const argTargetDir = argv._[0]
    ? sanitizeTargetDir(String(argv._[0]))
    : undefined;
  const argRepo = argv.repo;
  const argOverwrite = argv.overwrite;
  const argImmediate = argv.immediate;

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
        validate: (value) => {
          return !value || sanitizeTargetDir(value).length > 0
            ? undefined
            : "Invalid project name";
        },
      });
      if (prompts.isCancel(projectName)) {
        return cancel();
      }
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
        if (prompts.isCancel(res)) {
          return cancel();
        }
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
        prompts.log.error("Target directory is not empty.");
        process.exit(1);
    }
  }

  const root = path.join(process.cwd(), targetDir);

  // 3. Download from repo or copy template
  try {
    if (argRepo) {
      prompts.log.step(`Downloading ${argRepo}...`);
      await downloadTemplate(argRepo, { dir: root });
      prompts.log.success(`Project created in ${root}`);
    } else {
      prompts.log.step(`Copying template...`);
      const templateDir = fileURLToPath(
        new URL("../template", import.meta.url),
      );
      // Copy template to target directory
      fs.cpSync(templateDir, root, {
        recursive: true,
        filter: (src) => [".npmrc"].every((file) => !src.endsWith(file)),
      });
      // Rename _gitignore to .gitignore
      fs.renameSync(
        path.join(root, "_gitignore"),
        path.join(root, ".gitignore"),
      );
      prompts.log.success(`Project created in ${root}`);
    }
  } catch (error) {
    prompts.log.error("Failed to create project from template");
    console.error(error);
    process.exit(1);
  }

  // Update project name in package.json
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    prompts.log.error("No package.json found in project");
    process.exit(1);
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    pkg.name = path.basename(root);
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  } catch (error) {
    prompts.log.error("Failed to update project name in package.json");
    console.error(error);
    process.exit(1);
  }

  const userAgent = process.env.npm_config_user_agent;
  const pkgManager = userAgent?.split(" ")[0]?.split("/")[0] || "npm";

  // 4. Ask about skills installation
  if (interactive) {
    const skillsResult = await prompts.confirm({
      message: "Install the coding agents skills? (recommended)",
      initialValue: true,
    });
    if (prompts.isCancel(skillsResult)) {
      return cancel();
    }
    if (skillsResult) {
      run(
        [
          ...getPkgExecCmd(pkgManager, "skills"),
          "add",
          "alpic-ai/skybridge",
          "-s",
          "chatgpt-app-builder",
        ],
        {
          stdio: "inherit",
          cwd: targetDir,
        },
      );
    }
  }

  // 5. Ask about immediate installation
  let immediate = argImmediate;
  if (immediate === undefined) {
    if (interactive) {
      const immediateResult = await prompts.confirm({
        message: `Install with ${pkgManager} and start now?`,
      });
      if (prompts.isCancel(immediateResult)) {
        return cancel();
      }
      immediate = immediateResult;
    } else {
      immediate = false;
    }
  }

  const installCmd = [pkgManager, "install"];

  const runCmd = [pkgManager];
  switch (pkgManager) {
    case "yarn":
    case "pnpm":
    case "bun":
      break;
    case "deno":
      runCmd.push("task");
      break;
    default:
      runCmd.push("run");
  }
  runCmd.push("dev");

  if (!immediate) {
    prompts.outro(
      `Done! Next steps:
  cd ${targetDir}
  ${installCmd.join(" ")}
  ${runCmd.join(" ")}
`,
    );
    return;
  }

  prompts.log.step(`Installing dependencies with ${pkgManager}...`);
  run(installCmd, {
    stdio: "inherit",
    cwd: root,
  });

  prompts.log.step("Starting dev server...");
  run(runCmd, {
    stdio: "inherit",
    cwd: root,
  });
}

function run([command, ...args]: string[], options?: SpawnOptions) {
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

// Skip user's SPEC.md and IDE/agent preferences (.idea, .claude, etc.)
function isSkippedEntry(entry: fs.Dirent) {
  return (
    (entry.name.startsWith(".") && entry.isDirectory()) ||
    entry.name === "SPEC.md"
  );
}

function isEmpty(dirPath: string) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.every(isSkippedEntry);
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isSkippedEntry(entry)) {
      continue;
    }
    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
  }
}

function getPkgExecCmd(pkgManager: string, cmd: string): string[] {
  switch (pkgManager) {
    case "yarn":
      return ["yarn", "dlx", cmd];
    case "pnpm":
      return ["pnpm", "dlx", cmd];
    case "bun":
      return ["bunx", cmd];
    case "deno":
      return ["deno", "run", "-A", `npm:${cmd}`];
    default:
      return ["npx", cmd];
  }
}
