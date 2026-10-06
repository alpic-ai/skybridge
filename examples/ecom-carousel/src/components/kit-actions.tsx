import { useEffect, useRef, useState } from "react";
import { useModelContext } from "skybridge/web";
import { variantOptions } from "../lib/kit";
import { discussionId, productDeepLink } from "../lib/kit-state";
import type { Product, Variant } from "../tools/render-carousel.js";
import * as styles from "../views/shop.css";
import { updateDiscussion, useDiscussionState } from "./discussion-state";

export function KitActions({
  product,
  variant,
  onAdd,
  quantity = 1,
  pluginId,
}: {
  product: Product;
  variant: Variant | undefined;
  onAdd: (product: Product, variant: Variant) => void;
  quantity?: number;
  pluginId?: string | null;
}) {
  const { supported, context, update } = useModelContext();
  const { pending, content: discussionContent } = useDiscussionState(context);
  const [message, setMessage] = useState("");
  const [showLink, setShowLink] = useState(false);
  const linkInput = useRef<HTMLInputElement>(null);
  const shareUrl = variant
    ? productDeepLink(pluginId, product.id, variant.id)
    : null;
  useEffect(() => {
    if (showLink) {
      linkInput.current?.focus();
      linkInput.current?.select();
    }
  }, [showLink]);
  const id = variant ? discussionId(product.id, variant.id) : "";
  const attached =
    discussionContent.some(
      (block) => block._meta?.["skybridge/shop-variant"] === id,
    ) ?? false;
  async function discuss() {
    if (!variant || pending) {
      return;
    }
    setMessage("");
    const addition: typeof discussionContent = [];
    if (!attached) {
      const image = variant.media[0] ?? product.card.media[0];
      addition.push({
        type: "text",
        text: JSON.stringify({
          productId: product.id,
          variantId: variant.id,
          quantity,
          title: variant.title,
          options: variantOptions(product, variant),
          price: variant.price,
          available: !variant.outOfStock,
          description: variant.description,
          specifications: variant.specs,
        }),
        _meta: {
          "openai/title": `${variant.title} · ${variantOptions(product, variant) || "Selected item"}`,
          ...(image ? { "openai/thumbnail": { src: image } } : {}),
          "skybridge/shop-variant": id,
        },
      });
    }
    try {
      await updateDiscussion(
        (latest) => [
          ...latest.filter(
            (block) => block._meta?.["skybridge/shop-variant"] !== id,
          ),
          ...addition,
        ],
        (content) => update({ content }),
      );
    } catch {
      setMessage("Could not update chat attachments. Try again.");
    }
  }
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.primary}
        disabled={!variant || variant.outOfStock}
        onClick={() => {
          if (variant) {
            onAdd(product, variant);
            setMessage("Added to My Kit");
          }
        }}
      >
        Add to kit
      </button>
      {supported ? (
        <button
          type="button"
          className={styles.button}
          disabled={!variant || pending}
          aria-pressed={attached}
          onClick={discuss}
        >
          {pending
            ? "Updating…"
            : attached
              ? "Remove from discussion"
              : "Discuss this item"}
        </button>
      ) : null}
      {shareUrl ? (
        <button
          type="button"
          className={styles.button}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setShowLink(false);
              setMessage("Product link copied");
            } catch {
              setShowLink(true);
              setMessage(
                "Select the link below and copy it with your keyboard.",
              );
            }
          }}
        >
          Copy product link
        </button>
      ) : null}
      {shareUrl && showLink ? (
        <input
          ref={linkInput}
          type="text"
          className={styles.input}
          aria-label="Product link"
          readOnly
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
      <span role="status" className={styles.status}>
        {message}
      </span>
    </div>
  );
}
