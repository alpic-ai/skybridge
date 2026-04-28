import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { ViewHostType } from "./server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TemplateHelper {
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const cached = this.templateCache.get(templateName);
    if (cached) {
      return cached;
    }

    const templatePath = join(__dirname, "templates", `${templateName}.hbs`);
    const templateSource = readFileSync(templatePath, "utf-8");
    const template = Handlebars.compile(templateSource);

    this.templateCache.set(templateName, template);
    return template;
  }

  renderProduction(data: {
    hostType: ViewHostType;
    serverUrl: string;
    viewFile: string;
    styleFile: string;
  }): string {
    const template = this.loadTemplate("production");
    return template(data);
  }

  renderDevelopment(data: {
    hostType: ViewHostType;
    serverUrl: string;
    viewName: string;
  }): string {
    const template = this.loadTemplate("development");
    return template(data);
  }
}

export const templateHelper = new TemplateHelper();
