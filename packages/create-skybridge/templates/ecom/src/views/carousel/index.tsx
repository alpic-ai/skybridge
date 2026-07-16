import "../../index.css";

import { type ReactNode, useState } from "react";
import { EmptyState } from "../../components/empty-state";
import {
  ProductCard,
  ProductCardSkeleton,
} from "../../components/product-card";
import { ProductCarousel } from "../../components/product-carousel";
import { ViewFrame } from "../../components/view-frame";
import { sprinkles } from "../../design/tokens";
import { useToolInfo } from "../../helpers.js";
import { formatPrice } from "../../lib/format";
import type { Product } from "../../tools/render-carousel.js";

const SKELETON_COUNT = 4;

// One narration line per on-screen product. `id` ties the card back to its full
// record in structuredContent.
function narrate(product: Product, index: number): string {
  const { card } = product;
  const price = card.price ? ` - ${formatPrice(card.price)}` : "";
  const oos = card.outOfStock ? " [out of stock]" : "";
  return `${index + 1}. ${card.title} (id: ${product.id})${price}${oos}`;
}

/**
 * Carousel view for the `render-carousel` tool. Reads the full products from
 * `_meta` (via useToolInfo().responseMetadata) and renders one card each.
 * `structuredContent` is the model's grounding and is not used to render.
 */
function Carousel() {
  const { responseMetadata } = useToolInfo<"render-carousel">();
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);

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

  const products = responseMetadata?.products ?? [];

  if (products.length === 0) {
    return (
      <ViewFrame>
        <EmptyState message="No products to show." />
      </ViewFrame>
    );
  }

  const cards: ReactNode[] = [];
  for (const [index, product] of products.entries()) {
    const { card } = product;
    cards.push(
      <ProductCard
        key={product.id}
        data-llm={visibleIndices.includes(index) ? narrate(product, index) : ""}
        title={card.title}
        price={card.price}
        media={card.media}
        outOfStock={card.outOfStock}
      />,
    );
  }

  const narration = `Carousel of ${products.length} product(s); the user scrolls horizontally. On screen now:`;

  return (
    <ViewFrame>
      <div className={sprinkles({ p: "3xs" })}>
        <ProductCarousel
          onVisibleChange={setVisibleIndices}
          data-llm={narration}
        >
          {cards}
        </ProductCarousel>
      </div>
    </ViewFrame>
  );
}

export default Carousel;
