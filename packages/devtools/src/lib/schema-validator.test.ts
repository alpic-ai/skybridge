import type { RJSFSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import { validatorFor } from "./schema-validator.js";

const objectSchema = (
  $schema: string | undefined,
  property: string,
): RJSFSchema => ({
  ...($schema ? { $schema } : {}),
  type: "object",
  properties: { [property]: { type: "string" } },
  required: [property],
});

const errorsFor = (schema: RJSFSchema, formData: Record<string, unknown>) =>
  validatorFor(schema)
    .validateFormData(formData, schema)
    .errors.map((error) => error.stack);

describe("validatorFor", () => {
  it("validates 2020-12 schemas on their first compile", () => {
    const schema = objectSchema(
      "https://json-schema.org/draft/2020-12/schema",
      "keyword",
    );
    expect(errorsFor(schema, { keyword: "neverfull" })).toEqual([]);
    expect(errorsFor(schema, {})).toEqual([
      "must have required property 'keyword'",
    ]);
  });

  it("validates 2020-12 only keywords", () => {
    const schema: RJSFSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "array",
      prefixItems: [{ type: "string" }],
    };
    const errors = validatorFor(schema)
      .validateFormData([1], schema)
      .errors.map((error) => error.message);
    expect(errors).toEqual(["must be string"]);
  });

  it("keeps validating draft-07 schemas", () => {
    const schema = objectSchema(
      "http://json-schema.org/draft-07/schema#",
      "sku",
    );
    expect(errorsFor(schema, { sku: "M46987" })).toEqual([]);
    expect(errorsFor(schema, {})).toEqual([
      "must have required property 'sku'",
    ]);
  });

  it("keeps validating schemas without $schema", () => {
    const schema = objectSchema(undefined, "page");
    expect(errorsFor(schema, {})).toEqual([
      "must have required property 'page'",
    ]);
  });
});
