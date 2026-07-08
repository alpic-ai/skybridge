// Frames an example's view screenshot the way it actually appears: as the
// assistant's answer to a single user prompt in a chat.
//
// Two variants:
// - hero (default): full-width block for an example page. Pass `prompt`, `app`,
//   `src`, `alt`, `source` (GitHub URL), and optionally `demo` (live URL; the
//   demo card shows only when set).
// - card (`card` set): a clickable grid cell for the examples gallery. Pass
//   `prompt`, `src`, `alt`, `href`, `title`, and `description`.
//
// Theme-adaptive without a `.dark` selector: surfaces, borders, and the
// Skybridge mark follow `currentColor`; the prompt bubble is a low-alpha brand
// tint. The img carries Mintlify's prose `margin: 32px 0`, zeroed inline so the
// answer stays tight. Everything is inline: Mintlify inlines only the exported
// arrow's body and drops module-level imports/consts.
export const ChatExample = ({
  prompt,
  app,
  src,
  alt,
  source,
  demo,
  card,
  href,
  title,
  description,
}) =>
  card ? (
    <a
      href={href}
      className="sb-ex-card relative block my-2 w-full overflow-hidden rounded-2xl border border-gray-950/10 dark:border-white/10 cursor-pointer hover:!border-primary dark:hover:!border-primary-light"
      style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}
    >
      <style>{`
        /* Tailwind purges dark:bg-background-dark from this custom component on the
           hosted build, so the card base stayed white in dark mode. Drive it from
           Mintlify's theme vars in this always-emitted style block instead. */
        .sb-ex-card { background: rgb(var(--background-light)) !important; }
        .dark .sb-ex-card { background: rgb(var(--background-dark)) !important; }
        .sb-ex-card__link { text-decoration: none !important; }
        .sb-ex-card__link:hover {
          color: inherit !important;
          border-bottom-width: 1px !important;
          box-shadow: 0 1px 0 0 rgb(0 47 255) !important;
        }
        .dark .sb-ex-card__link:hover { box-shadow: 0 1px 0 0 rgb(8 245 249) !important; }
      `}</style>
      <div
        style={{
          height: "200px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "16px 24px",
          background: "color-mix(in srgb, currentColor 4%, transparent)",
          borderBottom: "1px solid color-mix(in srgb, currentColor 8%, transparent)",
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "85%",
            background: "color-mix(in srgb, #002FFF 7%, transparent)",
            border: "1px solid color-mix(in srgb, #002FFF 20%, transparent)",
            borderRadius: "10px 10px 2px 10px",
            padding: "5px 9px",
            fontSize: "0.7rem",
            lineHeight: 1.35,
          }}
        >
          {prompt}
        </div>
        <img
          src={src}
          alt={alt}
          className="not-prose"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            margin: 0,
            pointerEvents: "none",
            borderRadius: "8px",
            border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "20px 24px" }}>
        <h2 className="not-prose font-semibold text-base text-gray-800 dark:text-white" style={{ margin: 0 }}>
          {title}
        </h2>
        {description && (
          <p
            className="font-normal text-base leading-6 text-gray-600 dark:text-gray-400"
            style={{ margin: "4px 0 0" }}
          >
            {description}
          </p>
        )}
        {(demo || source) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "10px" }}>
            {demo && (
              <a
                className="sb-ex-card__link"
                href={demo}
                onClick={(e) => e.stopPropagation()}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", width: "fit-content", fontSize: "16px" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
                Try Demo
              </a>
            )}
            {source && (
              <a
                className="sb-ex-card__link"
                href={source}
                onClick={(e) => e.stopPropagation()}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", width: "fit-content", fontSize: "16px" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                    fill="currentColor"
                  />
                </svg>
                View code on GitHub
              </a>
            )}
          </div>
        )}
      </div>
    </a>
  ) : (
    <div
      style={{
        maxWidth: "880px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          padding: "20px",
          borderRadius: "20px",
          background: "color-mix(in srgb, currentColor 3%, transparent)",
          border: "1px solid color-mix(in srgb, currentColor 10%, transparent)",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "75%",
            background: "color-mix(in srgb, #002FFF 7%, transparent)",
            border: "1px solid color-mix(in srgb, #002FFF 20%, transparent)",
            borderRadius: "16px 16px 4px 16px",
            padding: "10px 14px",
            fontSize: "0.95rem",
            lineHeight: 1.45,
          }}
        >
          {prompt}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "0.8rem",
              fontWeight: 600,
              opacity: 0.7,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 90 90"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block" }}
            >
              <path
                d="M17.2704 89.9987C37.5976 24.3967 65.182 12.9084 89.9996 35.3807V84.1606C89.9996 87.3849 87.3858 89.9987 84.1615 89.9987H17.2704ZM84.1615 0C87.3858 0 89.9996 2.6139 89.9996 5.83819V30.9146C52.0566 -5.26767 14.9006 31.2366 0.000976562 57.6768V5.83819C0.00104114 2.6139 2.61486 2.23904e-08 5.83917 0H84.1615Z"
                fill="currentColor"
              />
            </svg>
            {app}
          </div>
          <img
            src={src}
            alt={alt}
            style={{
              display: "block",
              width: "100%",
              margin: 0,
              borderRadius: "12px",
              border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
            }}
          />
        </div>
      </div>
      {(source || demo) && (
        <CardGroup cols={demo && source ? 2 : 1}>
          {demo && (
            <Card title="Try the demo" icon="play" href={demo}>
              Launch the live view.
            </Card>
          )}
          {source && (
            <Card title="View source" icon="github" href={source}>
              Browse the example code.
            </Card>
          )}
        </CardGroup>
      )}
    </div>
  );
