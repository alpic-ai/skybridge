import { useState } from "react";
import type { Product, Variant } from "../tools/render-carousel.js";

export type KitItem = { product: Product; variantId: string; quantity: number };

// The demo kit belongs to this Shop view. Reopening Shop starts a fresh kit.
export function useKit() {
  const [items, setItems] = useState<KitItem[]>([]);

  function add(product: Product, variant: Variant) {
    setItems((current) => {
      const existing = current.find(
        (item) =>
          item.variantId === variant.id && item.product.id === product.id,
      );
      return existing
        ? current.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(99, item.quantity + 1) }
              : item,
          )
        : [...current, { product, variantId: variant.id, quantity: 1 }];
    });
  }

  function quantity(variantId: string, amount: number) {
    setItems((current) =>
      current.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(1, Math.min(99, amount)) }
          : item,
      ),
    );
  }

  return {
    items,
    add,
    quantity,
    remove: (variantId: string) =>
      setItems((current) =>
        current.filter((item) => item.variantId !== variantId),
      ),
  };
}

export function variantOptions(product: Product, variant: Variant) {
  return product.options
    .map((option) => {
      const value = option.values.find(
        (choice) => choice.id === variant.selection[option.id],
      );
      return value ? `${option.label}: ${value.label}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}
