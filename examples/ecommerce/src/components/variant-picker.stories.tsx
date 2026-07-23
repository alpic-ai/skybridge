import { useState } from "react";
import { initialSelection, type Selection } from "../lib/variants.js";
import type { Product } from "../tools/render-carousel.js";
import { VariantPicker } from "./variant-picker";

// A sparse catalog: {white,42} does not exist, so "42" is hard-disabled under
// "White"; {black,42} is sold out, so it renders struck (yet clickable) under
// "Black".
function variant(
  id: string,
  color: string,
  size: string,
  outOfStock = false,
): Product["variants"][number] {
  return {
    id,
    selection: { color, size },
    title: `Sneaker ${color} ${size}`,
    price: { amount: 120, currency: "EUR" },
    media: [],
    specs: [],
    outOfStock,
  };
}

const PRODUCT: Product = {
  id: "sneaker",
  options: [
    {
      id: "color",
      label: "Color",
      values: [
        { id: "black", label: "Black" },
        { id: "white", label: "White" },
      ],
    },
    {
      id: "size",
      label: "Size",
      values: [
        { id: "40", label: "40" },
        { id: "42", label: "42" },
      ],
    },
  ],
  variants: [
    variant("s-b-40", "black", "40"),
    variant("s-b-42", "black", "42", true),
    variant("s-w-40", "white", "40"),
  ],
  card: { title: "Sneaker", media: [], specs: [] },
};

export const Contingency = () => {
  const [selection, setSelection] = useState<Selection>(() =>
    initialSelection(PRODUCT),
  );
  return (
    <div style={{ maxWidth: 320 }}>
      <VariantPicker
        product={PRODUCT}
        selection={selection}
        onChange={setSelection}
      />
    </div>
  );
};
