import "../../index.css";

import { ViewFrame } from "../../components/view-frame";
import { sprinkles, text } from "../../design/tokens";
import { useToolInfo } from "../../helpers.js";

/**
 * Carousel view for the `render-carousel` tool.
 *
 * The tool puts the full products (with variants + media) in `_meta.products`,
 * read here via useToolInfo().responseMetadata. `structuredContent` is the
 * model's grounding and is NOT used to render.
 */
function Carousel() {
  const { responseMetadata } = useToolInfo<"render-carousel">();
  const products =
    (responseMetadata as { products?: unknown[] } | null)?.products ?? [];

  return (
    <ViewFrame>
      <div className={sprinkles({ p: "s" })}>
        <p className={text({ style: "bodyM" })}>
          {/* placeholder: replace this placeholder with the product carousel. */}
          Carousel view: {products.length} product(s).
        </p>
      </div>
    </ViewFrame>
  );
}

export default Carousel;
