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
import type { Product, Variant } from "../../../tools/render-carousel.js";
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
  variant: Variant | undefined,
  title: string,
  price: string,
  selection: Selection,
  unpurchasable: boolean,
  labels: Labels,
): string {
  const parts = [`The user is viewing "${title}" (product id: ${product.id}).`];
  const chosen: string[] = [];
  for (const option of product.options) {
    const valueId = selection[option.id];
    let label: string | undefined;
    for (const value of option.values) {
      if (value.id === valueId) {
        label = value.label;
        break;
      }
    }
    if (label === undefined) {
      // Axis skipped by the shown variant vs simply not picked yet.
      label =
        variant != null && variant.selection[option.id] == null
          ? "not applicable"
          : "not selected";
    }
    chosen.push(`${option.label}: ${label}`);
  }
  if (chosen.length > 0) {
    parts.push(`Selected — ${chosen.join(", ")}.`);
  }
  parts.push(`Price: ${price}.`);
  if (unpurchasable) {
    // Sold-out real variant vs a combination that does not exist.
    parts.push(
      variant != null ? labels.outOfStock : labels.combinationUnavailable,
    );
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

  // The exact variant for the selection; card fields fill in when none
  // resolves (the applyChoice edge case, or a product with no variants).
  const shown = resolveVariant(product, selection);
  const displayTitle = shown?.title ?? product.card.title;
  const description = shown?.description ?? product.card.description;
  const media = shown?.media.length ? shown.media : product.card.media;
  const specs = shown?.specs ?? product.card.specs;
  // Sold out, or no variant resolved.
  const unpurchasable = shown ? (shown.outOfStock ?? false) : true;
  const url = shown?.url ?? product.card.url;
  // The shown item's id: the resolved variant's SKU, else the product id.
  const reference = shown?.id ?? product.id;
  // @todo: read any custom Meta fields you added the same way (shown first,
  // then card), e.g. `const rating = shown?.rating ?? product.card.rating;`,
  // then render them in the agreed spot (rating by the title, discount by the
  // price, badges as chips…).

  const price = priceText(product, shown?.price, locale, labels);
  // Buy CTA is enabled only for an exact, in-stock variant with a real link
  // (an empty url would leave the button enabled but dead).
  const canBuy = shown != null && Boolean(url) && !unpurchasable;

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
        shown,
        displayTitle,
        price,
        selection,
        unpurchasable,
        labels,
      )}
    >
      {/* Product / variant reference, idiomatically top-right. @todo: move it
          (e.g. into the info column under the title) or drop it; restyle in
          detail.css.ts (`reference`). */}
      <p className={cx(text({ style: "bodyS" }), styles.reference)}>
        {labels.reference} {reference}
      </p>

      <div className={styles.grid}>
        <div className={styles.galleryCell}>
          {media.length > 0 ? (
            // Key on the media set so switching to a variant with different
            // images remounts the gallery fresh (index reset to the first image).
            <ImageGallery
              key={media.join("|")}
              media={media}
              alt={displayTitle}
            />
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

          <VariantPicker
            product={product}
            selection={selection}
            onChange={setSelection}
          />

          {description ? <ExpandableText>{description}</ExpandableText> : null}

          {/* Sold-out and unresolved selections stay composable; the CTA locks
              and its label names the cause. */}
          <button
            type="button"
            className={cx(styles.cta, sprinkles({ mt: "3xs" }))}
            disabled={!canBuy}
            onClick={canBuy && url ? () => openExternal(url) : undefined}
          >
            {shown
              ? unpurchasable
                ? labels.outOfStock
                : labels.viewOnSite
              : labels.combinationUnavailable}
          </button>

          {/* Product facts as a simple list, after the CTA: one "label: value"
              line per fact (label-less facts show the value alone). This is the
              visual treatment only; the full spec is already in view state for
              the model (see the carousel orchestrator), so restyling or dropping
              it never hides facts from the assistant. @todo: pick the shape that
              best presents your specs: this list (default), a two-column table,
              grouped sections, inline chips, etc. */}
          {specs.length > 0 ? (
            <section>
              <h2 className={text({ style: "labelM", weight: "medium" })}>
                {labels.specifications}
              </h2>
              <dl className={styles.specList}>
                {specs.map((spec) => (
                  <div
                    key={`${spec.label ?? ""}:${spec.value}`}
                    className={styles.specRow}
                  >
                    {spec.label ? (
                      <dt
                        className={cx(
                          text({ style: "bodyS" }),
                          styles.specLabel,
                        )}
                      >
                        {spec.label}:
                      </dt>
                    ) : null}
                    <dd
                      className={cx(text({ style: "bodyS" }), styles.specValue)}
                    >
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
