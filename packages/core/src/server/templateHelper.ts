import type { WidgetHostType } from "./server.js";
import developmentTemplate from "./templates/development.js";
import productionTemplate from "./templates/production.js";

class TemplateHelper {
  renderProduction(data: {
    hostType: WidgetHostType;
    serverUrl: string;
    widgetFile: string;
    styleFile: string;
  }): string {
    return productionTemplate(data);
  }

  renderDevelopment(data: {
    hostType: WidgetHostType;
    serverUrl: string;
    useLocalNetworkAccess: boolean;
    widgetName: string;
  }): string {
    return developmentTemplate(data);
  }
}

export const templateHelper = new TemplateHelper();
