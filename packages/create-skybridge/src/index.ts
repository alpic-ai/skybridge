import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import * as prompts from "@clack/prompts";
import mri from "mri";

const defaultProjectName = "skybridge-project";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

/**
 * Detect which package manager to use based on:
 * 1. Lock files in the target directory
 * 2. packageManager field in package.json
 * 3. Global availability
 */
function detectPackageManager(projectRoot: string): PackageManager {
  // Check for lock files in the project
  const lockFiles: Record<string, PackageManager> = {
    "pnpm-lock.yaml": "pnpm",
    "package-lock.json": "npm",
    "yarn.lock": "yarn",
    "bun.lockb": "bun",
  };

  for (const [lockFile, pm] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(projectRoot, lockFile))) {
      return pm;
    }
  }

  // Check packageManager field in package.json
  const pkgJsonPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      if (pkg.packageManager && typeof pkg.packageManager === "string") {
        const pmName = pkg.packageManager.split("@")[0] as PackageManager;
        if (["pnpm", "npm", "yarn", "bun"].includes(pmName)) {
          return pmName;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Default to pnpm (template's default)
  return "pnpm";
}

/**
 * Check if a package manager is available globally
 */
function isPackageManagerAvailable(pm: PackageManager): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32" ? `${pm}.cmd` : pm;
    const child = spawn(cmd, ["--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

/**
 * Run a command with the specified package manager
 */
function runPackageManagerCommand(
  pm: PackageManager,
  args: string[],
  cwd: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === "win32" ? `${pm}.cmd` : pm;
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("close", (code) => {
      if (code !== null) {
        resolve(code);
      } else {
        reject(new Error("Process terminated without exit code"));
      }
    });

    child.on("error", reject);
  });
}

// prettier-ignore
const helpMessage = `\
Usage: create-skybridge [OPTION]... [DIRECTORY]

Create a new Skybridge project by copying the starter template.

Options:
  -h, --help              show this help message
  --overwrite             remove existing files in target directory
  --immediate             auto-install dependencies and start development server

Examples:
  create-skybridge my-app
  create-skybridge . --overwrite
  create-skybridge my-app --immediate
`;

export async function init(args: string[] = process.argv.slice(2)) {
  const argv = mri<{
    help?: boolean;
    overwrite?: boolean;
    immediate?: boolean;
  }>(args, {
    boolean: ["help", "overwrite", "immediate"],
    alias: { h: "help" },
  });

  const argTargetDir = argv._[0]
    ? sanitizeTargetDir(String(argv._[0]))
    : undefined;
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
    fs.cpSync(templateDir, root, { recursive: true });
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

    // Auto-install and auto-start if --immediate flag is set
    if (argImmediate) {
      const packageManager = detectPackageManager(root);

      // Check if package manager is available
      const pmAvailable = await isPackageManagerAvailable(packageManager);
      if (!pmAvailable) {
        prompts.log.warn(
          `Package manager "${packageManager}" not found. Please install dependencies manually.`,
        );
        prompts.outro(
          `Done! Next steps:\n\n  cd ${targetDir}\n  ${packageManager} install\n  ${packageManager} dev`,
        );
        return;
      }

      // Install dependencies
      prompts.log.step(`Installing dependencies with ${packageManager}...`);
      try {
        const installCode = await runPackageManagerCommand(
          packageManager,
          ["install"],
          root,
        );
        if (installCode !== 0) {
          prompts.log.error("Failed to install dependencies");
          prompts.outro(
            `Project created but installation failed. Try running:\n\n  cd ${targetDir}\n  ${packageManager} install`,
          );
          return;
        }
        prompts.log.success("Dependencies installed successfully");
      } catch (error) {
        prompts.log.error("Failed to install dependencies");
        console.error(error);
        prompts.outro(
          `Project created but installation failed. Try running:\n\n  cd ${targetDir}\n  ${packageManager} install`,
        );
        return;
      }

      // Start development server
      prompts.log.step(
        `Starting development server with ${packageManager} dev...`,
      );
      prompts.outro(
        `Project created and dependencies installed!\n\nStarting development server...`,
      );

      try {
        // Run dev server (this will block until user stops it)
        await runPackageManagerCommand(packageManager, ["dev"], root);
      } catch (error) {
        prompts.log.error("Failed to start development server");
        console.error(error);
        prompts.outro(
          `Try running:\n\n  cd ${targetDir}\n  ${packageManager} dev`,
        );
      }
    } else {
      // Original behavior: just show next steps
      const packageManager = detectPackageManager(root);
      prompts.outro(
        `Done! Next steps:\n\n  cd ${targetDir}\n  ${packageManager} install\n  ${packageManager} dev`,
      );
    }
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
