import { useEffect, useRef, useState } from "react";
import { useLabels } from "../i18n";
import { cx } from "../lib/cx";
import * as styles from "./image-gallery.css";

// @todo: show a thumbnail rail beside the image on desktop (at the two-column
// breakpoint); swipe-only when false. Off by default. When true, tune the rail
// width / thumb size in image-gallery.css.ts. Deferred polish (add if the rail
// earns it): an edge-fade mask and auto-centering the active thumb, both of
// which need a vertical scroll-edges hook.
const THUMBNAIL_RAIL: boolean = false;

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

/**
 * Product image gallery: a native scroll-snap track with prev/next chevrons and
 * a progress bar; the current index is read from scroll position (no library).
 * With the rail on, a desktop thumbnail rail is added as a second controller of
 * the SAME track (shared index, click = scroll). Mobile is always the swipe
 * track.
 */
export function ImageGallery({ media, alt }: { media: string[]; alt: string }) {
  const labels = useLabels();
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [imageHeight, setImageHeight] = useState<number>();

  function onScroll() {
    const el = trackRef.current;
    if (el) {
      setIndex(Math.round(el.scrollLeft / el.clientWidth));
    }
  }

  function scrollToIndex(i: number) {
    const el = trackRef.current;
    if (el) {
      el.scrollTo({ left: i * el.clientWidth });
    }
  }

  // The gallery stays mounted across a variant switch, so reset to the first
  // image when the media set changes; otherwise a stale index can point past a
  // shorter set (bad progress width, wrong nav state).
  useEffect(() => {
    setIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [media]);

  // Rail only: cap the rail to the main image's height so it scrolls instead of
  // stretching the layout. A vertical scroll container needs a definite height;
  // the square image provides it, measured here.
  useEffect(() => {
    if (!THUMBNAIL_RAIL) {
      return;
    }
    const el = trackRef.current;
    if (!el) {
      return;
    }
    const measure = () => setImageHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const multiple = media.length > 1;

  return (
    <div
      className={cx(styles.gallery, THUMBNAIL_RAIL && styles.galleryRail)}
      aria-roledescription={labels.carousel}
      aria-label={alt}
    >
      {THUMBNAIL_RAIL && multiple ? (
        <div
          ref={railRef}
          className={styles.rail}
          style={{ maxHeight: imageHeight ? `${imageHeight}px` : undefined }}
        >
          {media.map((src, i) => (
            <button
              key={src}
              type="button"
              className={cx(styles.thumb, i === index && styles.thumbActive)}
              aria-label={`${alt} (${i + 1})`}
              aria-current={i === index}
              onClick={() => scrollToIndex(i)}
            >
              <img
                className={styles.thumbImage}
                src={src}
                alt=""
                draggable={false}
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.mainCol}>
        <div ref={trackRef} className={styles.track} onScroll={onScroll}>
          {media.map((src, i) => (
            <div key={src} className={styles.slide}>
              <img
                className={styles.image}
                src={src}
                alt={i === 0 ? alt : ""}
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {multiple ? (
          <>
            <button
              type="button"
              aria-label={labels.previous}
              className={cx(styles.nav, styles.navPrev)}
              disabled={index === 0}
              onClick={() => scrollToIndex(index - 1)}
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              aria-label={labels.next}
              className={cx(styles.nav, styles.navNext)}
              disabled={index === media.length - 1}
              onClick={() => scrollToIndex(index + 1)}
            >
              <Chevron direction="right" />
            </button>
            <div
              className={cx(
                styles.progress,
                THUMBNAIL_RAIL && styles.progressMobileOnly,
              )}
              aria-hidden="true"
            >
              <div
                className={styles.progressFill}
                style={{ width: `${((index + 1) / media.length) * 100}%` }}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
