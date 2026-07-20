import { useEffect, useState } from "react";
import { useOpenExternal, useSetOpenInAppUrl, useUser } from "skybridge/web";
import { ExpandableText } from "../../../components/expandable-text";
import { ImageGallery } from "../../../components/image-gallery";
import { VariantPicker } from "../../../components/variant-picker";
import { sprinkles, text } from "../../../design/tokens";
import { type Labels, useLabels } from "../../../i18n";
import { cx } from "../../../lib/cx";
import { formatPrice } from "../../../lib/format";
import {
  initialSelection,
  resolveVariant,
  type Selection,
} from "../../../lib/variants.js";
import type { Product } from "../../../tools/render-carousel.js";
import * as styles from "./detail.css";

// Price to show: the resolved variant's price, else the range across variants
// (or a single price when they agree), else the card price, else a fallback.
function priceText(
  product: Product,
  variantPrice: Product["card"]["price"],
  locale: string,
  labels: Labels,
): string {
  if (variantPrice) {
    return formatPrice(variantPrice, locale);
  }
  const amounts: number[] = [];
  let currency = "";
  for (const variant of product.variants) {
    if (variant.price) {
      amounts.push(variant.price.amount);
      currency = variant.price.currency;
    }
  }
  if (amounts.length > 0) {
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    if (min === max) {
      return formatPrice({ amount: min, currency }, locale);
    }
    return `${formatPrice({ amount: min, currency }, locale)} – ${formatPrice({ amount: max, currency }, locale)}`;
  }
  if (product.card.price) {
    return formatPrice(product.card.price, locale);
  }
  return labels.priceOnRequest;
}

// data-llm narrates the variant the user is currently looking at. The full
// product spec (every variant) is pushed to view state by the carousel
// orchestrator, so the model can answer beyond what is on screen; this stays
// scoped to the visible selection.
function grounding(
  product: Product,
  title: string,
  price: string,
  selection: Selection,
  outOfStock: boolean,
  labels: Labels,
): string {
  const parts = [`The user is viewing "${title}" (product id: ${product.id}).`];
  const chosen: string[] = [];
  for (const option of product.options) {
    let label = "not selected";
    const valueId = selection[option.id];
    for (const value of option.values) {
      if (value.id === valueId) {
        label = value.label;
        break;
      }
    }
    chosen.push(`${option.label}: ${label}`);
  }
  if (chosen.length > 0) {
    parts.push(`Selected — ${chosen.join(", ")}.`);
  }
  parts.push(`Price: ${price}.`);
  if (outOfStock) {
    parts.push(labels.outOfStock);
  }
  return parts.join(" ");
}

/**
 * Product detail view, rendered fullscreen over the carousel (see the carousel
 * orchestrator). Reads a single product from the payload already in `_meta`;
 * does no fetch. Option choices resolve against the product's sparse variant
 * list in-place (no remount).
 */
export function DetailView({ product }: { product: Product }) {
  const { locale } = useUser();
  const labels = useLabels();
  const openExternal = useOpenExternal();
  const setOpenInAppUrl = useSetOpenInAppUrl();
  const [selection, setSelection] = useState<Selection>(() =>
    initialSelection(product),
  );

  const variant = resolveVariant(product, selection);
  // Fall back to the card for display fields until a variant resolves.
  const displayTitle = variant?.title ?? product.card.title;
  const description = variant?.description ?? product.card.description;
  const media = variant?.media.length ? variant.media : product.card.media;
  const attributes = variant?.attributes ?? product.card.attributes;
  const outOfStock = variant?.outOfStock ?? product.card.outOfStock ?? false;
  const url = variant?.url ?? product.card.url;

  const price = priceText(product, variant?.price, locale, labels);
  // Buy CTA is enabled only once a variant resolves and carries a real link
  // (an empty url would leave the button enabled but dead).
  const canBuy = variant != null && Boolean(url);

  // Point the host's fullscreen "Open in app" affordance at the selected
  // variant's page. Apps-SDK only; MCP Apps hosts reject, so ignore that.
  useEffect(() => {
    if (url) {
      setOpenInAppUrl(url).catch(() => {});
    }
  }, [url, setOpenInAppUrl]);

  return (
    <div
      className={styles.detail}
      data-llm={grounding(
        product,
        displayTitle,
        price,
        selection,
        outOfStock,
        labels,
      )}
    >
      <div className={styles.grid}>
        <div className={styles.galleryCell}>
          {media.length > 0 ? (
            <ImageGallery media={media} alt={displayTitle} />
          ) : null}
        </div>

        <div className={styles.info}>
          <h1
            className={cx(
              text({ style: "headingS", weight: "medium" }),
              styles.title,
            )}
          >
            {displayTitle}
          </h1>

          <p className={cx(text({ style: "headingS" }), styles.price)}>
            {price}
          </p>

          {outOfStock ? (
            <p className={cx(text({ style: "bodyS" }), styles.oos)}>
              {labels.outOfStock}
            </p>
          ) : null}

          <VariantPicker
            product={product}
            selection={selection}
            onChange={setSelection}
          />

          {description ? <ExpandableText>{description}</ExpandableText> : null}

          <button
            type="button"
            className={cx(styles.cta, sprinkles({ mt: "3xs" }))}
            disabled={!canBuy}
            onClick={canBuy && url ? () => openExternal(url) : undefined}
          >
            {variant ? labels.viewOnSite : labels.selectOptions}
          </button>

          {/* Specs rendered as a simple table, after the CTA. This is the visual
              treatment only — the full spec is already in view state for the
              model (see the carousel orchestrator), so hiding the table never
              hides specs from the assistant. @todo: group/collapse, restyle, or
              drop the table entirely. */}
          {attributes.length > 0 ? (
            <section className={styles.specs}>
              <h2 className={text({ style: "labelM", weight: "medium" })}>
                {labels.specifications}
              </h2>
              {attributes.map((attribute) => (
                <div key={attribute.name} className={styles.specRow}>
                  <span
                    className={cx(text({ style: "bodyS" }), styles.specName)}
                  >
                    {attribute.name}
                  </span>
                  <span
                    className={cx(text({ style: "bodyS" }), styles.specValue)}
                  >
                    {attribute.value}
                  </span>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
