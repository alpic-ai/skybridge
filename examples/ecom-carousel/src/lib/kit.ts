import { useCallback, useEffect, useState } from "react";
import { useViewState } from "skybridge/web";
import type { Product, Variant } from "../tools/render-carousel.js";

import { type KitItem, parseKit, saveKit } from "./kit-state";

export type { KitItem } from "./kit-state";

const CHANGED = "skybridge-shop-kit-changed";

// A host-provided subject + session scope is required for shared browser storage.
// Without one, persistence belongs only to this tool invocation's host view state.
export function useKit(scope: string | null, persistHost = true) {
  const [hostState, setHostState] = useViewState<{ kitItems: KitItem[] }>({
    kitItems: [],
  });
  const [scoped, setScoped] = useState<{
    key: string | null;
    items: KitItem[];
  }>({ key: null, items: [] });
  const key = scope ? `skybridge-shop-kit:${scope}` : null;
  useEffect(() => {
    if (!key) {
      return;
    }
    const read = () => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
        setScoped({ key, items: parseKit(parsed) });
      } catch {
        setScoped({ key, items: [] });
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(CHANGED, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(CHANGED, read);
    };
  }, [key]);
  const current =
    key || !persistHost
      ? scoped.key === key
        ? scoped.items
        : []
      : parseKit(hostState.kitItems);
  const replace = useCallback(
    (next: KitItem[]) => {
      if (key) {
        setScoped({ key, items: next });
        try {
          saveKit(localStorage, key, next, () =>
            window.dispatchEvent(new Event(CHANGED)),
          );
        } catch {
          /* Keep this view usable if access to browser storage is denied. */
        }
      } else if (persistHost) {
        setHostState((previous) => ({ ...previous, kitItems: next }));
      } else {
        setScoped({ key: null, items: next });
      }
    },
    [key, persistHost, setHostState],
  );
  function add(product: Product, variant: Variant) {
    const existing = current.find(
      (item) => item.variantId === variant.id && item.product.id === product.id,
    );
    replace(
      existing
        ? current.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(99, item.quantity + 1) }
              : item,
          )
        : [...current, { product, variantId: variant.id, quantity: 1 }],
    );
  }
  function quantity(variantId: string, amount: number) {
    replace(
      current.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(1, Math.min(99, amount)) }
          : item,
      ),
    );
  }
  return {
    items: current,
    add,
    quantity,
    remove: (variantId: string) =>
      replace(current.filter((item) => item.variantId !== variantId)),
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
