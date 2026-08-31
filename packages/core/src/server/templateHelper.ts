import {
  developmentTemplate,
  productionTemplate,
} from "./templates.generated.js";

class TemplateHelper {
  renderProduction(data: {
    serverUrl: string;
    viewFile: string;
    styleFile: string;
  }): string {
    return productionTemplate(data);
  }

  renderDevelopment(data: { serverUrl: string; viewName: string }): string {
    return developmentTemplate(data);
  }
}

export const templateHelper = new TemplateHelper();
