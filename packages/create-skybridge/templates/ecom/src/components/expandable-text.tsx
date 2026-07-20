import { useLayoutEffect, useRef, useState } from "react";
import { text } from "../design/tokens";
import { useLabels } from "../i18n";
import { cx } from "../lib/cx";
import * as styles from "./expandable-text.css";

/**
 * Clamps long copy to a few lines with a "read more" toggle. Truncation is
 * measured, not assumed: the toggle only appears when the text actually
 * overflows the collapsed height, so short copy shows no button.
 */
export function ExpandableText({ children }: { children: string }) {
  const labels = useLabels();
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const collapsed = !expanded;

  // Measure against the collapsed height (the clamp is applied whenever
  // collapsed, so scrollHeight vs clientHeight is meaningful). Re-run when the
  // text changes (e.g. the client switches variant) so the toggle tracks it.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && collapsed) {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    }
  }, [children, collapsed]);

  return (
    <div className={styles.container}>
      <p
        ref={bodyRef}
        className={cx(
          text({ style: "bodyS" }),
          styles.body({ clamp: collapsed, fade: collapsed && overflows }),
        )}
      >
        {children}
      </p>
      {overflows ? (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? labels.readLess : labels.readMore}
        </button>
      ) : null}
    </div>
  );
}
