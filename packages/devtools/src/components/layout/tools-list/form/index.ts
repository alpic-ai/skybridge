import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
  ArrayFieldItemTemplate,
  ArrayFieldTemplate,
  BaseInputTemplate,
  DescriptionFieldTemplate,
  FieldErrorTemplate,
  FieldTemplate,
  formButtonTemplates,
  ObjectFieldTemplate,
  TitleFieldTemplate,
} from "./templates.js";
import { formWidgets } from "./widgets.js";

export const formTemplates = {
  ArrayFieldItemTemplate,
  ArrayFieldTemplate,
  BaseInputTemplate,
  DescriptionFieldTemplate,
  FieldErrorTemplate,
  FieldTemplate,
  ObjectFieldTemplate,
  TitleFieldTemplate,
  ButtonTemplates: formButtonTemplates,
};

const baseUiSchema: UiSchema = {
  "ui:submitButtonOptions": { norender: true },
};

function isArrayOfEnum(schema: RJSFSchema | undefined): boolean {
  if (!schema || schema.type !== "array") {
    return false;
  }
  const items = schema.items;
  if (!items || Array.isArray(items) || typeof items === "boolean") {
    return false;
  }
  return Array.isArray((items as RJSFSchema).enum);
}

function buildUiSchemaFromSchema(
  schema: RJSFSchema | undefined,
): UiSchema | undefined {
  if (!schema || typeof schema !== "object") {
    return undefined;
  }
  if (isArrayOfEnum(schema)) {
    return { "ui:widget": "checkboxes" };
  }
  if (schema.type === "object" && schema.properties) {
    const entries: [string, UiSchema][] = [];
    for (const [key, child] of Object.entries(schema.properties)) {
      const childUi = buildUiSchemaFromSchema(child as RJSFSchema);
      if (childUi) {
        entries.push([key, childUi]);
      }
    }
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  return undefined;
}

export function buildFormUiSchema(schema: RJSFSchema): UiSchema {
  const derived = buildUiSchemaFromSchema(schema);
  return derived ? { ...baseUiSchema, ...derived } : baseUiSchema;
}

export { formWidgets };
