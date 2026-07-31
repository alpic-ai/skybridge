import type { StandardSchemaV1 } from "@modelcontextprotocol/server";

export type RawInputShape = Record<string, StandardSchemaV1>;

export type InferSchemaOutput<S> = S extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<S>
  : never;
