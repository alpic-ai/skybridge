import type { RJSFSchema } from "@rjsf/utils";
import validatorDraft07, { customizeValidator } from "@rjsf/validator-ajv8";
import Ajv2020 from "ajv/dist/2020.js";

const validator2020 = customizeValidator({ AjvClass: Ajv2020 });

export function validatorFor(schema: RJSFSchema | undefined) {
  return schema?.$schema?.includes("draft-07")
    ? validatorDraft07
    : validator2020;
}
