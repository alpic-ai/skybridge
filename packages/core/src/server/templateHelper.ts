import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { WidgetHostType } from "./server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localNetworkAccessCheckPartial = readFileSync(
  join(__dirname, "templates", "local-network-access-check.hbs"),
  "utf-8",
);
Handlebars.registerPartial(
  "local-network-access-check",
  localNetworkAccessCheckPartial,
);

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
    hostType: WidgetHostType;
    serverUrl: string;
    widgetFile: string;
    styleFile: string;
  }): string {
    const template = this.loadTemplate("production");
    return template(data);
  }

  renderDevelopment(data: {
    hostType: WidgetHostType;
    serverUrl: string;
    widgetName: string;
  }): string {
    const template = this.loadTemplate("development");
    return template(data);
  }
}

export const templateHelper = new TemplateHelper();
