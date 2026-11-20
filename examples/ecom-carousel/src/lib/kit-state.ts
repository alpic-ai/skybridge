import type { Product } from "../tools/render-carousel.js";

export function discussionId(productId: string, variantId: string) {
  return JSON.stringify([productId, variantId]);
}

export function preferenceSelection(
  product: Product,
  preferences?: { size?: string; color?: string },
) {
  return product.variants.find(
    (variant) =>
      !variant.outOfStock &&
      product.options.every((option) => {
        const preference = /size/i.test(option.label)
          ? preferences?.size
          : /colou?r/i.test(option.label)
            ? preferences?.color
            : null;
        const value = option.values.find(
          (entry) => entry.id === variant.selection[option.id],
        );
        return (
          !preference ||
          preference === "any" ||
          !option.values.some(
            (entry) => entry.label.toLowerCase() === preference.toLowerCase(),
          ) ||
          value?.label.toLowerCase() === preference.toLowerCase()
        );
      }),
  )?.selection;
}

export function productDeepLink(
  pluginId: string | null | undefined,
  productId: string,
  variantId: string,
): string | null {
  if (!pluginId?.trim()) {
    return null;
  }
  const path = `/products/${encodeURIComponent(productId)}?variant=${encodeURIComponent(variantId)}`;
  return `https://chatgpt.com/plugins/${encodeURIComponent(pluginId.trim())}/app/shop?path=${encodeURIComponent(path)}`;
}
