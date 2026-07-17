import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLabels } from "../i18n";
import { cx } from "../lib/cx";
import * as styles from "./product-carousel.css";

// How long to wait after the last intersection change before reporting, so a
// fast scroll does not spam updates.
const VISIBILITY_DEBOUNCE_MS = 200;

// @todo: for boxed cards (border + background), set this to true and leave the
// carousel unframed. Pick one, not both.
const FRAMED = false;

function Chevron({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

type ProductCarouselProps = {
  children: ReactNode;
  // Reports which child indices are at least half in view, in ascending order,
  // debounced. Use it to narrate only what the user actually sees.
  onVisibleChange?: (indices: number[]) => void;
  // Skeleton state: locks the scroll and hides the nav buttons.
  loading?: boolean;
};

/**
 * Horizontal, scroll-snapping track of cards. Generic: it renders whatever
 * children it is given, one per snap cell. Native scroll handles touch; the
 * prev/next buttons are desktop-only affordances (see product-carousel.css.ts).
 */
export function ProductCarousel({
  children,
  onVisibleChange,
  loading = false,
}: ProductCarouselProps) {
  const labels = useLabels();
  const trackRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Keep the latest callback in a ref so the observer effect does not
  // re-subscribe when the parent passes a new function each render.
  const onVisibleChangeRef = useRef(onVisibleChange);
  onVisibleChangeRef.current = onVisibleChange;

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [updateEdges]);

  // Track which cells are in view and report them (only when a consumer asks).
  const childCount = Children.count(children);
  // Re-subscribe when a consumer starts (or stops) passing onVisibleChange, even
  // if the child count is unchanged; the callback itself is read via the ref.
  const observeVisibility = onVisibleChange != null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: childCount and observeVisibility drive re-subscription; neither is read inside the effect.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !observeVisibility) {
      return;
    }
    const cells = Array.from(el.children);
    const visible = new Set<number>();
    let timer: number | undefined;
    const emit = () => {
      const indices = [...visible].sort((a, b) => a - b);
      onVisibleChangeRef.current?.(indices);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = cells.indexOf(entry.target);
          if (index === -1) {
            continue;
          }
          if (entry.isIntersecting) {
            visible.add(index);
          } else {
            visible.delete(index);
          }
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(emit, VISIBILITY_DEBOUNCE_MS);
      },
      { root: el, threshold: 0.5 },
    );
    for (const cell of cells) {
      observer.observe(cell);
    }
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [childCount, observeVisibility]);

  const step = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    const cell = el.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
    const distance = cell ? cell.offsetWidth + gap : el.clientWidth;
    // No `behavior`: inherits the track's CSS scroll-behavior (respects
    // prefers-reduced-motion).
    el.scrollBy({ left: direction * distance });
  };

  const cells: ReactNode[] = [];
  const items = Children.toArray(children);
  for (let i = 0; i < items.length; i++) {
    cells.push(
      <div key={i} className={styles.cell}>
        {items[i]}
      </div>,
    );
  }

  return (
    <div className={styles.carousel({ framed: FRAMED })}>
      <section
        ref={trackRef}
        className={styles.track({ framed: FRAMED, loading })}
        aria-roledescription={labels.carousel}
        aria-label={labels.products}
      >
        {cells}
      </section>
      {loading ? null : (
        <>
          <button
            type="button"
            aria-label={labels.previous}
            className={cx(styles.nav, styles.navPrev)}
            disabled={!canScrollLeft}
            onClick={() => step(-1)}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            className={cx(styles.nav, styles.navNext)}
            disabled={!canScrollRight}
            onClick={() => step(1)}
          >
            <Chevron direction="right" />
          </button>
        </>
      )}
    </div>
  );
}
