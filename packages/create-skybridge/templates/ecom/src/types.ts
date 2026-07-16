import { z } from "zod";

export const PriceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
});
export type Price = z.infer<typeof PriceSchema>;

export const AttributeSchema = z.object({
  name: z.string(),
  value: z.string(),
});
export type Attribute = z.infer<typeof AttributeSchema>;
