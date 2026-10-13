import type { RJSFSchema } from "@rjsf/utils";
import validatorDraft07, { customizeValidator } from "@rjsf/validator-ajv8";
import Ajv2020 from "ajv/dist/2020.js";

const JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema";

const validator2020 = customizeValidator({ AjvClass: Ajv2020 });

export function validatorFor(schema: RJSFSchema | undefined) {
  return schema?.$schema === JSON_SCHEMA_2020_12
    ? validator2020
    : validatorDraft07;
}
