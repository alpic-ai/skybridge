import { useUser } from "skybridge/web";

// Centralized UI labels. The active locale comes from the host via useUser();
// useLabels matches on the language subtag ("en-US" -> "en") and falls back to
// English for anything unlisted.
// @todo: adapt the English copy to your brand voice, and add a locale key (e.g.
// `fr`) with the same shape for each language you want to support.
const LABELS = {
  en: {
    outOfStock: "Out of stock",
    noProducts: "No products to show.",
    carousel: "carousel",
    products: "Products",
    previous: "Previous",
    next: "Next",
  },
} as const;

const DEFAULT_LOCALE = "en";

type Labels = (typeof LABELS)[typeof DEFAULT_LOCALE];

export function useLabels(): Labels {
  const { locale } = useUser();
  const lang = locale.split("-")[0] ?? DEFAULT_LOCALE;
  return lang in LABELS ? LABELS[lang as keyof typeof LABELS] : LABELS.en;
}
