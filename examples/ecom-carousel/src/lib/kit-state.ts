import type { Product } from "../tools/render-carousel.js";
export type KitItem = { product: Product; variantId: string; quantity: number };

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}
function specs(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        object(entry) &&
        typeof entry.value === "string" &&
        (entry.label === undefined || typeof entry.label === "string"),
    )
  );
}
function meta(value: unknown) {
  return (
    object(value) &&
    typeof value.title === "string" &&
    strings(value.media) &&
    specs(value.specs) &&
    (value.price === undefined ||
      (object(value.price) &&
        Number.isFinite(value.price.amount) &&
        typeof value.price.currency === "string"))
  );
}
export function parseKit(value: unknown): KitItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is KitItem => {
    if (
      !object(item) ||
      typeof item.variantId !== "string" ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      !object(item.product)
    ) {
      return false;
    }
    const product = item.product;
    return (
      typeof product.id === "string" &&
      meta(product.card) &&
      Array.isArray(product.options) &&
      product.options.every(
        (option) =>
          object(option) &&
          typeof option.id === "string" &&
          typeof option.label === "string" &&
          Array.isArray(option.values) &&
          option.values.every(
            (choice) =>
              object(choice) &&
              typeof choice.id === "string" &&
              typeof choice.label === "string",
          ),
      ) &&
      Array.isArray(product.variants) &&
      product.variants.every(
        (variant) =>
          meta(variant) &&
          object(variant) &&
          typeof variant.id === "string" &&
          object(variant.selection) &&
          Object.values(variant.selection).every(
            (entry) => typeof entry === "string",
          ),
      ) &&
      product.variants.some(
        (variant) => object(variant) && variant.id === item.variantId,
      )
    );
  });
}
export function saveKit(
  storage: Pick<Storage, "setItem">,
  key: string,
  items: KitItem[],
  notify: () => void,
) {
  try {
    storage.setItem(key, JSON.stringify(items));
  } catch {
    return false;
  }
  notify();
  return true;
}
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
