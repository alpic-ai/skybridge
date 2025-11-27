import Handlebars from "handlebars";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type TemplateData = {
  serverUrl: string;
  widgetName: string;
};

class TemplateHelper {
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = join(__dirname, "templates", `${templateName}.hbs`);
    const templateSource = readFileSync(templatePath, "utf-8");
    const template = Handlebars.compile(templateSource);

    this.templateCache.set(templateName, template);
    return template;
  }

  renderProduction(data: {
    serverUrl: string;
    widgetFile: string;
    styleFile: string;
  }): string {
    const template = this.loadTemplate("production");
    return template(data);
  }

  renderDevelopment(data: { serverUrl: string; widgetName: string }): string {
    const template = this.loadTemplate("development");
    return template(data);
  }
}

export const templateHelper = new TemplateHelper();
