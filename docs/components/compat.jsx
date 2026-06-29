// Host-compatibility badges, rendered inline. Pass `alpic`, `chatgpt`, and/or
// `claude`; hosts render in lexicographic order. SVGs are inlined so fills can
// follow the theme: Alpic is always #ed115e, Claude keeps its brand orange, and
// ChatGPT uses currentColor (black in light mode, white in dark).
//
// Two modes:
// - default: an outlined pill (logo + name), bordered in the host color. Used
//   under a hook-page title.
// - `compact`: the bare logo with a hover tooltip, no negative margin. Used in
//   table cells (e.g. the overview matrix).
//
// Everything is inline: Mintlify inlines only the exported arrow's body into
// the page module and drops module-level imports/consts.
export const Compat = ({
  alpic = false,
  chatgpt = false,
  claude = false,
  compact = false,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      marginTop: compact ? 0 : "-1rem",
    }}
  >
    {/* CSS tooltip for compact mode: the native title attribute is unreliable
        here. The block repeats per instance, but the rules are idempotent. */}
    {compact ? (
      <style>{`
        .compat-host { position: relative; display: inline-flex; align-items: center; }
        .compat-host .compat-tip {
          position: absolute; bottom: calc(100% + 6px); left: 50%;
          transform: translateX(-50%); white-space: nowrap;
          background: #1b1b1b; color: #fff; font-size: 0.7rem; line-height: 1;
          padding: 4px 6px; border-radius: 4px; opacity: 0; pointer-events: none;
          transition: opacity 0.1s; z-index: 10;
        }
        .compat-host:hover .compat-tip { opacity: 1; }
      `}</style>
    ) : null}
    {[
      [
        chatgpt,
        "ChatGPT",
        "currentColor",
        <svg
          width="15"
          height="15"
          viewBox="0 0 320 320"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <path
            d="m297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z"
            fill="currentColor"
          />
        </svg>,
      ],
      [
        claude,
        "Claude",
        "hsl(14.8, 63.1%, 59.6%)",
        <svg
          width="15"
          height="15"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          fill="hsl(14.8, 63.1%, 59.6%)"
          style={{ display: "block" }}
        >
          <path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" />
        </svg>,
      ],
      [
        alpic,
        "Playground",
        "#ed115e",
        <svg
          width="15"
          height="15"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <path
            d="M7.36252 20H1C0.447715 20 0 19.5525 0 19.0002V8.64125C0 7.7312 1.07185 7.33361 1.61891 8.06088C3.88388 11.072 6.54471 15.467 8.23237 18.5553C8.59108 19.2117 8.11057 20 7.36252 20Z"
            fill="#ed115e"
          />
          <path
            d="M16 20H11.1107C10.7358 20 10.3946 19.7932 10.2195 19.4617C8.22533 15.6861 3.80403 8.28701 0.270194 4.42269C0.0974742 4.23382 0 3.9897 0 3.73376V1C0 0.447715 0.447246 0 0.999531 0H3.05772C3.30196 0 3.53551 0.0838936 3.71011 0.254673C6.93512 3.40909 14.7578 15.5906 16.6046 19.093C16.8622 19.5815 16.5523 20 16 20Z"
            fill="#ed115e"
          />
          <path
            d="M20 10.2704L20 19.0376C20 20.0405 18.7155 20.4032 18.197 19.5447C15.2475 14.6612 10.1233 6.14055 6.79571 1.78274C6.26283 1.08489 6.76006 0 7.6381 0H12.0171C12.3221 0 12.6082 0.136431 12.7973 0.375776C14.006 1.90563 18.5473 7.68266 19.8591 9.76898C19.9539 9.91962 20 10.0924 20 10.2704Z"
            fill="#ed115e"
          />
          <path
            d="M19 0H16.0188C15.2029 0 14.7304 0.924361 15.2082 1.58566L18.6421 6.33806C19.0682 6.92777 20 6.62636 20 5.89881V1C20 0.447715 19.5523 0 19 0Z"
            fill="#ed115e"
          />
        </svg>,
      ],
    ]
      .filter(([on]) => on)
      .map(([, label, color, svg]) =>
        compact ? (
          <span key={label} className="compat-host">
            {svg}
            <span className="compat-tip">{label}</span>
          </span>
        ) : (
          <span
            key={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              border: `1px solid ${color}`,
              color,
              borderRadius: "9999px",
              padding: "2px 9px",
              fontSize: "0.75rem",
              fontWeight: 500,
            }}
          >
            {svg}
            {label}
          </span>
        ),
      )}
  </div>
);
