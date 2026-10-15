import type { RJSFSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import { validator } from "./schema-validator.js";

const messages = (schema: RJSFSchema, formData: unknown) =>
  validator.validateFormData(formData, schema).errors.map((e) => e.message);

describe("validator", () => {
  it("validates a 2020-12 schema on its first compile", () => {
    const schema: RJSFSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: { keyword: { type: "string" } },
      required: ["keyword"],
    };
    expect(messages(schema, { keyword: "neverfull" })).toEqual([]);
    expect(messages(schema, {})).toEqual([
      "must have required property 'keyword'",
    ]);
  });

  it("validates schemas without $schema as 2020-12, the MCP default dialect", () => {
    const schema: RJSFSchema = {
      type: "array",
      prefixItems: [{ type: "string" }],
    };
    expect(messages(schema, [1])).toEqual(["must be string"]);
  });
});
