import "../../index.css";

import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDisplayMode, useViewState } from "skybridge/web";
import { EmptyState } from "../../components/empty-state";
import {
  ProductCard,
  ProductCardSkeleton,
} from "../../components/product-card";
import * as cardStyles from "../../components/product-card.css";
import { ProductCarousel } from "../../components/product-carousel";
import { ViewFrame } from "../../components/view-frame";
import { sprinkles } from "../../design/tokens";
import { useToolInfo } from "../../helpers.js";
import { useLabels } from "../../i18n";
import { formatPrice } from "../../lib/format";
import type { Product } from "../../tools/render-carousel.js";
import type { Price, Spec } from "../../types.js";
import { DetailView } from "./detail";

const SKELETON_COUNT = 4;

// One narration line per on-screen product. `id` ties the card back to its full
// record in structuredContent.
function narrate(product: Product, index: number): string {
  const { card } = product;
  const price = card.price ? ` - ${formatPrice(card.price)}` : "";
  const oos = card.outOfStock ? " [out of stock]" : "";
  return `${index + 1}. ${card.title} (id: ${product.id})${price}${oos}`;
}

// View state, persisted on the host so an open detail survives a remount (e.g.
// after a follow-up message). scrollLeft restores the carousel position on the
// way back; spec is the full product spec (every variant) the model can answer
// from while the detail is open.
type VariantSpec = {
  selection: Record<string, string>; // option label -> chosen value label
  price?: Price;
  available: boolean;
  specs: Spec[];
};
type ProductSpec = { id: string; title: string; variants: VariantSpec[] };
type ViewState = {
  selectedId: string | null;
  scrollLeft: number;
  spec: ProductSpec | null;
};

// The complete spec of the open product — every variant, not just the visible
// one — pushed to view state so the model can answer any detail question. The
// on-screen variant is narrated separately (data-llm, in the detail view). Keep
// it to a single product; a very large spec trips the view-state size warning.
function buildProductSpec(product: Product): ProductSpec {
  const variants: VariantSpec[] = [];
  for (const variant of product.variants) {
    const selection: Record<string, string> = {};
    for (const option of product.options) {
      const valueId = variant.selection[option.id];
      if (!valueId) {
        continue;
      }
      let label = valueId;
      for (const value of option.values) {
        if (value.id === valueId) {
          label = value.label;
          break;
        }
      }
      selection[option.label] = label;
    }
    variants.push({
      selection,
      price: variant.price,
      available: !variant.outOfStock,
      specs: variant.specs,
    });
  }
  return { id: product.id, title: product.card.title, variants };
}

/**
 * Carousel view + product detail, in one view. The carousel is the inline
 * surface; tapping a card opens the detail fullscreen over it (the carousel is
 * hidden, not unmounted). Both read the full products from `_meta`; the detail
 * needs no extra fetch.
 */
function Carousel() {
  const { responseMetadata } = useToolInfo<"render-carousel">();
  const labels = useLabels();
  const trackRef = useRef<HTMLElement>(null);
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);
  const [mode, setMode] = useDisplayMode();
  const [nav, setNav] = useViewState<ViewState>({
    selectedId: null,
    scrollLeft: 0,
    spec: null,
  });
  // True between requesting fullscreen and the host applying it, so the
  // collapse-is-back effect below does not fire mid-transition.
  const enteringRef = useRef(false);

  const selectedId = nav.selectedId;
  // The detail only mounts once the host is actually fullscreen: rendering the
  // tall page inside the small inline frame would flash a cramped layout.
  const showDetail = selectedId != null && mode === "fullscreen";

  // A host-driven exit from fullscreen (the user used host chrome) means "back".
  useEffect(() => {
    if (mode === "fullscreen") {
      enteringRef.current = false;
      return;
    }
    if (selectedId != null && !enteringRef.current) {
      setNav((prev) => ({ ...prev, selectedId: null, spec: null }));
    }
  }, [mode, selectedId, setNav]);

  // Restore carousel scroll when back on the carousel. display:none resets
  // scrollLeft, so re-apply once it is visible again (layout effect, not mount).
  useLayoutEffect(() => {
    if (!showDetail && trackRef.current) {
      trackRef.current.scrollLeft = nav.scrollLeft;
    }
  }, [showDetail, nav.scrollLeft]);

  function openProduct(id: string) {
    enteringRef.current = true;
    const list = responseMetadata?.products ?? [];
    let spec: ProductSpec | null = null;
    for (const product of list) {
      if (product.id === id) {
        spec = buildProductSpec(product);
        break;
      }
    }
    setNav({
      selectedId: id,
      scrollLeft: trackRef.current?.scrollLeft ?? 0,
      spec,
    });
    setMode("fullscreen");
  }

  // Tool still resolving: reserve the layout with skeleton cards.
  if (responseMetadata == null) {
    const skeletons: ReactNode[] = [];
    for (let i = 0; i < SKELETON_COUNT; i++) {
      skeletons.push(<ProductCardSkeleton key={i} />);
    }
    return (
      <ViewFrame>
        <div className={sprinkles({ p: "3xs" })}>
          <ProductCarousel loading>{skeletons}</ProductCarousel>
        </div>
      </ViewFrame>
    );
  }

  const products = responseMetadata.products ?? [];

  if (products.length === 0) {
    return (
      <ViewFrame>
        <EmptyState message={labels.noProducts} />
      </ViewFrame>
    );
  }

  // Guard against a stale id (e.g. the model rendered a new carousel while a
  // detail was open): fall back to the carousel rather than an empty page.
  const selectedProduct =
    selectedId != null
      ? products.find((product) => product.id === selectedId)
      : undefined;
  // The detail actually renders only when we have a product to show. Everything
  // that hides the carousel keys off this, so a stale id shows the carousel, not
  // a blank page.
  const detailProduct = showDetail ? selectedProduct : undefined;

  const cards: ReactNode[] = [];
  for (const [index, product] of products.entries()) {
    const { card } = product;
    cards.push(
      <div key={product.id} className={cardStyles.cardClickable}>
        <ProductCard
          // Drop per-card grounding while the detail owns the screen.
          data-llm={
            !detailProduct && visibleIndices.includes(index)
              ? narrate(product, index)
              : ""
          }
          title={card.title}
          price={card.price}
          media={card.media}
          outOfStock={card.outOfStock}
          badges={card.badges}
          rating={card.rating}
          reviewCount={card.reviewCount}
        />
        <button
          type="button"
          aria-label={card.title}
          className={cardStyles.cardButton}
          onClick={() => openProduct(product.id)}
        />
      </div>,
    );
  }

  const narration = `Carousel of ${products.length} product(s); the user scrolls horizontally. On screen now:`;

  return (
    <ViewFrame>
      <div
        className={sprinkles({ p: "3xs" })}
        style={{ display: detailProduct ? "none" : undefined }}
      >
        <ProductCarousel
          trackRef={trackRef}
          onVisibleChange={setVisibleIndices}
          data-llm={detailProduct ? "" : narration}
        >
          {cards}
        </ProductCarousel>
      </div>
      {detailProduct ? <DetailView product={detailProduct} /> : null}
    </ViewFrame>
  );
}

export default Carousel;
