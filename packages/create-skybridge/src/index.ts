import { type SpawnOptions, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prompts from "@clack/prompts";
import mri from "mri";

const defaultProjectName = "skybridge-project";

const templates = [
  { value: "default", label: "a minimal implementation" },
  { value: "ecom", label: "a functional ecommerce carousel" },
];

// prettier-ignore
const helpMessage = `\
Usage: create-skybridge [OPTION]... [DIRECTORY]

Create a new Skybridge project by copying the starter template.

Options:
  -h, --help              show this help message
  --overwrite             remove existing files in target directory
  --immediate             install dependencies and start development server
  --template <template>   use a specific template

Available templates:
${templates.map((t) => `  ${t.value.padEnd(23)} ${t.label}`).join("\n")}

Examples:
  create-skybridge my-app
  create-skybridge . --overwrite --immediate
`;

export async function init(args: string[] = process.argv.slice(2)) {
  const argv = mri<{
    help?: boolean;
    overwrite?: boolean;
    immediate?: boolean;
    template?: string;
  }>(args, {
    boolean: ["help", "overwrite", "immediate"],
    alias: { h: "help", t: "template" },
  });

  const argTargetDir = argv._[0]
    ? sanitizeTargetDir(String(argv._[0]))
    : undefined;
  const argOverwrite = argv.overwrite;
  const argImmediate = argv.immediate;
  const argTemplate = argv.template;

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
      if (prompts.isCancel(projectName)) {
        return cancel();
      }
      targetDir = sanitizeTargetDir(projectName);
    } else {
      targetDir = defaultProjectName;
    }
  }

  // 2. Select a template
  const hasInvalidTemplate =
    argTemplate && !templates.some((t) => t.value === argTemplate);
  let template: string | symbol | undefined = argTemplate;
  if (interactive) {
    if (!argTemplate || hasInvalidTemplate) {
      let message = "Please choose a template:";
      if (hasInvalidTemplate) {
        message = `${argTemplate} is not a valid template. Please choose one of the following:`;
      }

      template = await prompts.select({
        message,
        options: templates.map((t) => ({
          value: t.value,
          label: `${t.value}: ${t.label}`,
        })),
      });

      if (prompts.isCancel(template)) {
        return cancel();
      }
    }
  } else if (hasInvalidTemplate) {
    prompts.log.error(
      `Template is not a valid template. Please choose one of the following: ${templates.map((t) => t.value).join(", ")}`,
    );
    process.exit(1);
  }

  let templatePath = "../template";
  switch (template) {
    case "ecom":
      templatePath = "../template-ecom";
      break;
  }

  // 3. Handle directory if exist and not empty
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
        cancel();
        return;
    }
  }

  const root = path.join(process.cwd(), targetDir);

  // 4. Copy the template
  prompts.log.step(`Copying template...`);

  try {
    const templateDir = fileURLToPath(new URL(templatePath, import.meta.url));
    // Copy template to target directory
    fs.cpSync(templateDir, root, {
      recursive: true,
      filter: (src) => [".npmrc"].every((file) => !src.endsWith(file)),
    });
    // Write .gitignore
    fs.writeFileSync(
      path.join(root, ".gitignore"),
      `node_modules/
dist/
.env*
.DS_store`,
    );
    // Update project name in package.json
    const name = path.basename(root);
    const pkgPath = path.join(root, "package.json");
    const pkg = fs.readFileSync(pkgPath, "utf-8");
    const fixed = pkg.replace(/apps-sdk-template/g, name);
    fs.writeFileSync(pkgPath, fixed);

    prompts.log.success(`Project created in ${root}`);
  } catch (error) {
    prompts.log.error("Failed to copy repository");
    console.error(error);
    process.exit(1);
  }

  const userAgent = process.env.npm_config_user_agent;
  const pkgManager = userAgent?.split(" ")[0]?.split("/")[0] || "npm";

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
