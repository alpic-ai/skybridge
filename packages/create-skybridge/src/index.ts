import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prompts from "@clack/prompts";
import spawn from "cross-spawn";
import mri from "mri";

const DEFAULT_PROJECT_NAME = "skybridge-project";

const PACKAGE_MANAGERS = ["bun", "deno", "npm", "pnpm", "yarn"] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const TEMPLATES = ["demo", "blank"] as const;
type Template = (typeof TEMPLATES)[number];

const pkg = JSON.parse(
  fs.readFileSync(
    fileURLToPath(new URL("../package.json", import.meta.url)),
    "utf-8",
  ),
);
const version = pkg.version;

const HELP_MESSAGE = `Usage: skybridge create [path] [options]

⛰ Skybridge v${version} - the fullstack framework for building MCP Apps

Arguments:
  path           Where the project will be created. Prompted when omitted.

Options:
  --blank        scaffold a minimal project without demo tools and views
  --overwrite    remove existing files if target directory is not empty
  --pm <choice>  package manager to use (choices: ${PACKAGE_MANAGERS.join(", ")}. default: npm)
  --skip-skills  skip installing coding agent skills
  --start        start dev server
  --yes          skip prompts and use default values for unprovided options
  --help         display this help message

Non-interactive usage:
  Mandatory: path argument and --yes option
  Example: skybridge create my-app --yes`;

const isTTY = process.stdout.isTTY;
const _spinner = prompts.spinner();
const Spinner = {
  start(msg: string) {
    if (!isTTY) {
      prompts.log.info(msg);
    } else {
      _spinner.clear();
      _spinner.start(msg);
    }
  },
  stop(msg: string) {
    if (!isTTY) {
      prompts.log.success(msg);
    } else {
      _spinner.stop(msg);
    }
  },
  error(msg: string) {
    if (!isTTY) {
      prompts.log.error(msg);
    } else {
      _spinner.error(msg);
    }
  },
};

export async function init(args: string[] = process.argv.slice(2)) {
  const argv = mri<{
    help?: boolean;
    blank?: boolean;
    overwrite?: boolean;
    pm?: string;
    "skip-skills"?: boolean;
    start?: boolean;
    yes?: boolean;
  }>(args, {
    boolean: ["help", "blank", "overwrite", "skip-skills", "start", "yes"],
    string: ["pm"],
    alias: { h: "help" },
  });

  if (argv.help) {
    console.log(HELP_MESSAGE);
    return;
  }

  const { yes } = argv;

  let targetDir = argv._[0] ? sanitizeTargetDir(String(argv._[0])) : undefined;
  if (yes && !targetDir) {
    abort(
      "The target directory is required in non-interactive mode.",
      "Example: skybridge create my-app --yes",
    );
  }

  let pm = parsePackageManager(argv.pm || "");
  if (argv.pm && !pm) {
    abort(
      `Invalid --pm value "${argv.pm}". Expected one of: ${PACKAGE_MANAGERS.join(", ")}.`,
    );
  }

  console.log(); // cosmetic line break
  prompts.intro(
    `\x1b[1;36m⛰  Welcome to Skybridge v${version} \x1b[22m- the fullstack framework for building MCP Apps\x1b[0m`,
  );

  // 1. Target directory
  if (!targetDir) {
    const choice = await prompts.text({
      message: "Project directory:",
      placeholder: DEFAULT_PROJECT_NAME,
      defaultValue: DEFAULT_PROJECT_NAME,
      validate: (value) =>
        !value || sanitizeTargetDir(value).length > 0
          ? undefined
          : "Invalid project name",
    });
    if (prompts.isCancel(choice)) {
      return cancel();
    }
    targetDir = sanitizeTargetDir(choice);
  }

  // 2. Existing-directory handling
  if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
    if (argv.overwrite) {
      emptyDir(targetDir);
    } else if (yes) {
      prompts.log.error(
        `Target directory "${targetDir}" is not empty. Use --overwrite to remove existing files.`,
      );
      process.exit(1);
    } else {
      const ok = await prompts.confirm({
        message: `Target directory "${targetDir}" is not empty. Remove existing files?`,
        initialValue: true,
      });
      if (prompts.isCancel(ok) || !ok) {
        return cancel();
      }
      Spinner.start(`Cleaning up ${targetDir}`);
      emptyDir(targetDir);
      Spinner.stop(`Cleaned up ${targetDir}`);
    }
  }

  // 3. Template
  let template: Template;
  if (argv.blank) {
    template = "blank";
  } else if (yes) {
    template = "demo";
  } else {
    const choice = await prompts.select<Template>({
      message: "Choose a template:",
      options: [
        {
          value: "demo",
          label: "demo",
          hint: "starter code with tools and UI",
        },
        {
          value: "blank",
          label: "blank",
          hint: "minimal boilerplate without tools",
        },
      ],
      initialValue: "demo",
    });
    if (prompts.isCancel(choice)) {
      return cancel();
    }
    template = choice;
  }

  // 4. Copy template
  const root = path.resolve(targetDir);
  Spinner.start(`Copying ${template} template`);
  try {
    const templateDir = fileURLToPath(
      new URL(`../templates/${template}`, import.meta.url),
    );
    fs.cpSync(templateDir, root, {
      recursive: true,
      filter: (src: string) => [".npmrc"].every((file) => !src.endsWith(file)),
    });
    const gitignoreSource = path.join(root, "_gitignore");
    if (fs.existsSync(gitignoreSource)) {
      fs.renameSync(gitignoreSource, path.join(root, ".gitignore"));
    }
    Spinner.stop(`Copied ${template} template`);
  } catch (error) {
    Spinner.error("Failed to copy template");
    abort(String(error));
  }

  // 5. Set package.json name to the project dir basename
  try {
    const pkgPath = path.join(root, "package.json");
    const projectPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    projectPkg.name = path.basename(root);
    fs.writeFileSync(pkgPath, `${JSON.stringify(projectPkg, null, 2)}\n`);
  } catch (error) {
    abort("Failed to update project name in package.json.", String(error));
  }

  // 6. Skills install (single Y/n prompt)
  let installSkills: boolean;
  if (argv["skip-skills"]) {
    installSkills = false;
  } else if (yes) {
    installSkills = true;
  } else {
    const choice = await prompts.confirm({
      message: "Install coding agent skills? (recommended)",
      initialValue: true,
    });
    if (prompts.isCancel(choice)) {
      return cancel();
    }
    installSkills = choice;
  }

  if (installSkills) {
    Spinner.start("Installing coding agent skills");
    const status = await spawnAsync(
      "npx",
      [
        "--yes",
        "skills",
        "add",
        "alpic-ai/skybridge",
        "--skill",
        "chatgpt-app-builder",
        "--agent",
        "universal",
        "claude-code",
        "--yes",
      ],
      { stdio: "ignore", cwd: root },
    );
    if (status === 0) {
      Spinner.stop("Installed coding agent skills");
    } else {
      Spinner.error("Failed to install coding agent skills");
      prompts.log.warn(
        "Install them later with `npx skills add alpic-ai/skybridge`.",
      );
    }
  }

  // 7. Package manager — autodetect, prompt only if detection fails (interactive)
  if (!pm) {
    pm = detectPackageManager() || "npm";
  }
  if (!yes) {
    const choice = await prompts.select<PackageManager>({
      message: "Choose a package manager:",
      options: PACKAGE_MANAGERS.map((value) => ({ value })),
      initialValue: pm,
    });
    if (prompts.isCancel(choice)) {
      return cancel();
    }
    pm = choice;
  }

  // 8. Always install dependencies
  Spinner.start(`Installing dependencies with ${pm}`);
  const installStatus = await spawnAsync(pm, ["install"], {
    stdio: "ignore",
    cwd: root,
  });
  if (installStatus === 0) {
    Spinner.stop(`Installed dependencies with ${pm}`);
  } else {
    Spinner.error("Dependency installation failed");
    abort(`Try manually: cd ${targetDir} && ${pm} install`);
  }

  // 9. Start dev server?
  let start = false;
  if (argv.start) {
    start = true;
  } else if (!yes) {
    const choice = await prompts.confirm({
      message: "Start dev server now?",
      initialValue: true,
    });
    if (prompts.isCancel(choice)) {
      return cancel();
    }
    start = choice;
  }

  if (start) {
    prompts.outro(`Starting dev server in ${targetDir}…`);
    const devResult = spawn.sync(pm, scriptArgs(pm, "dev"), {
      stdio: "inherit",
      cwd: root,
    });
    process.exit(devResult.status ?? 0);
  }

  prompts.log.success("All set! Next steps:");

  prompts.log.info(`Start:
cd ${targetDir}
${scriptCommand(pm, "dev")}`);

  prompts.log.info(`Deploy:
${scriptCommand(pm, "deploy")}`);

  prompts.outro(`🛟  Need help?
   Chat: https://discord.alpic.ai
   Docs: https://docs.skybridge.tech`);
}

function cancel() {
  prompts.cancel("Operation cancelled");
  process.exit(0);
}

function abort(...lines: string[]) {
  for (const line of lines) {
    prompts.log.error(line);
  }
  prompts.outro("Aborted");
  process.exit(1);
}

// Async spawn wrapper used when we want a spinner to keep animating during
// the subprocess (cross-spawn.sync would block the event loop).
function spawnAsync(
  command: string,
  args: string[],
  options: Parameters<typeof spawn>[2],
): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args, options);
    child.on("close", (code) => resolve(code));
    child.on("error", () => resolve(1));
  });
}

function parsePackageManager(value: string): PackageManager | undefined {
  switch (value) {
    case "bun":
      return "bun";
    case "deno":
      return "deno";
    case "npm":
      return "npm";
    case "pnpm":
      return "pnpm";
    case "yarn":
      return "yarn";
    default:
      return undefined;
  }
}

function detectPackageManager(): PackageManager | undefined {
  const userAgent = process.env.npm_config_user_agent;
  if (!userAgent) {
    return undefined;
  }
  const name = userAgent.split(" ")[0]?.split("/")[0];
  return parsePackageManager(name);
}

function scriptArgs(pm: PackageManager, script: string): string[] {
  switch (pm) {
    case "yarn":
    case "pnpm":
    case "bun":
      return [script];
    case "deno":
      return ["task", script];
    case "npm":
      return ["run", script];
  }
}

function scriptCommand(pm: PackageManager, script: string): string {
  return [pm, ...scriptArgs(pm, script)].join(" ");
}

function sanitizeTargetDir(targetDir: string) {
  return targetDir.trim().replace(/\/+$/g, "");
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
