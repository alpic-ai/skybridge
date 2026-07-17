import type { ReactNode } from "react";
import { useUser } from "skybridge/web";
import { text } from "../design/tokens";
import { useLabels } from "../i18n";
import { cx } from "../lib/cx";
import { formatPrice } from "../lib/format";
import type { Price } from "../types.js";
import * as styles from "./product-card.css";

type ProductCardProps = {
  title: string;
  price?: Price;
  media?: string[]; // all images; the card decides which to show
  outOfStock?: boolean;
};

// @todo: for boxed cards (border + background), set this to true and leave the
// carousel unframed. Pick one, not both.
const FRAMED = false;

/**
 * A single product card: image, title, price, and an out-of-stock treatment.
 * Maps a product's display fields to markup; the view passes them in.
 */
export function ProductCard({
  title,
  price,
  media,
  outOfStock,
}: ProductCardProps) {
  const { locale } = useUser();
  const labels = useLabels();
  // Show the first image. @todo: the rest of `media` is available here, e.g.
  // to cross-fade to media[1] on hover.
  const cover = media?.[0];
  return (
    <article className={styles.card({ framed: FRAMED })}>
      <div className={styles.imageBox}>
        {cover ? (
          <img
            className={cx(styles.image, outOfStock && styles.imageDimmed)}
            src={cover}
            alt={title}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className={styles.placeholder} />
        )}
        {outOfStock ? (
          <span className={styles.oosBadge}>{labels.outOfStock}</span>
        ) : null}
      </div>

      <div className={styles.body}>
        <p
          className={cx(
            text({ style: "bodyS", weight: "medium" }),
            styles.title,
          )}
        >
          {title}
        </p>
        {price ? (
          <p className={cx(text({ style: "bodyS" }), styles.price)}>
            {formatPrice(price, locale)}
          </p>
        ) : null}
        {/* @todo: extra fields. Render catalog-specific data here, e.g. from the
            product's `attributes`: ratings, discounts, tags, badges. */}
      </div>
    </article>
  );
}

/** Placeholder card shown while the tool resolves. Same footprint as the card
 *  so the layout does not jump when data arrives. */
export function ProductCardSkeleton() {
  const titleLines: ReactNode[] = [];
  for (let i = 0; i < styles.TITLE_LINES; i++) {
    const isLast = i === styles.TITLE_LINES - 1;
    titleLines.push(
      <div
        key={i}
        className={cx(
          styles.skeletonBox,
          isLast ? styles.skeletonLineShort : styles.skeletonLine,
        )}
      />,
    );
  }
  return (
    <div className={styles.card({ framed: FRAMED })} aria-hidden="true">
      <div className={cx(styles.skeletonBox, styles.skeletonImage)} />
      <div className={styles.skeletonBody}>
        {titleLines}
        <div className={cx(styles.skeletonBox, styles.skeletonPrice)} />
      </div>
    </div>
  );
}
