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

  renderProduction(data: TemplateData): string {
    const template = this.loadTemplate("production");
    return template(data);
  }

  renderDevelopment(data: TemplateData): string {
    const template = this.loadTemplate("development");
    return template(data);
  }

  renderViteClient(data: TemplateData): string {
    const template = this.loadTemplate("vite-client");
    return template(data);
  }

  injectViteClient(html: string, data: TemplateData): string {
    const viteClientScript = this.renderViteClient(data);
    return viteClientScript + html;
  }
}

export const templateHelper = new TemplateHelper();
