import type { ViewHostType } from "./server.js";
import {
  developmentTemplate,
  productionTemplate,
} from "./templates.generated.js";

class TemplateHelper {
  renderProduction(data: {
    hostType: ViewHostType;
    serverUrl: string;
    viewFile: string;
    styleFile: string;
  }): string {
    return productionTemplate(data);
  }

  renderDevelopment(data: {
    hostType: ViewHostType;
    serverUrl: string;
    viewName: string;
  }): string {
    return developmentTemplate(data);
  }
}

export const templateHelper = new TemplateHelper();
