import { z } from "zod";

export const PriceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
});
export type Price = z.infer<typeof PriceSchema>;

// A product-specific fact (an objective spec: material, dimensions, capacity,
// care…). `label` is optional so a fact can be a bare value (e.g. "Waterproof").
export const SpecSchema = z.object({
  label: z.string().optional(),
  value: z.string(),
});
export type Spec = z.infer<typeof SpecSchema>;
