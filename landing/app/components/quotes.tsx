type Quote = { q: string; who: string; where: string; photo?: string };

type QuotesVariant =
  | "cards"
  | "social"
  | "tweets"
  | "linkedin"
  | "thread"
  | "spotlight"
  | "stack"
  | "terminal"
  | "stickers";

type StickerTint = "cyan" | "lime" | "pink" | "plain";

export function SBQuotes({
  quotesVariant = "cards",
}: {
  quotesVariant?: QuotesVariant;
} = {}) {
  const quotes: Quote[] = [
    {
      q: "In the past 24 hours I went from the template repo to three production-grade demos for our partners. Three. The way you've structured the Skybridge template is beautiful — extremely easy to leverage with Claude Opus and Codex.",
      who: "Asad Iqbal",
      where: "CTO · Noodle Seed",
      photo: "/assets/people/asad.webp",
    },
    {
      q: 'Skybridge\'s typed bridge between server tools and React widgets is the killer feature. useToolInfo<"my_tool">() knows exactly what our handler returns — server-side schema changes show up instantly as typecheck errors in the widget. Building MCP apps finally feels like building normal full-stack apps.',
      who: "Meir Kadosh",
      where: "AI Engineer · Brightdata",
      photo: "/assets/people/meir.webp",
    },
    {
      q: "Skybridge gave us a single typed runtime for both server tools and React widgets — same TS types, hot-reload, and one deploy step into Claude and ChatGPT. It's the first MCP framework that actually feels production-grade.",
      who: "Stefan Lederer",
      where: "CEO · Bitmovin",
      photo: "/assets/people/stefan.webp",
    },
    {
      q: "Skybridge was the obvious pick for our MCP stack. Even on the server side, where we're not yet using app view features, one cohesive runtime beats fragmenting our codebase across SDKs. And I've never seen a team ship fixes this fast.",
      who: "Axel Fournier",
      where: "Founding Engineer · Pletor",
      photo: "/assets/people/axel.webp",
    },
    {
      q: "Alpic and Skybridge made spinning up the Career Coach remarkably smooth. The MCP integration was clean, deployment was fast, and the developer experience was top-notch. Highly recommend their team!",
      who: "Adam M.",
      where: "CTO · Invirtus",
      photo: "/assets/people/adam.webp",
    },
    {
      q: "What sold us on Skybridge was how customizable the framework is, and how effective the type-safety is between the server and the frontend.",
      who: "Pierre-Loic de Schaetzen",
      where: "Software Engineer · Chift",
      photo: "/assets/people/pierre-loic.webp",
    },
  ];

  return (
    <section className="sb-section" id="quotes" style={{ paddingTop: 88 }}>
      <div className="sb-wrap">
        <div className="sb-section-header">
          <div className="sb-section-eyebrow">Testimonials</div>
          <h2 className="sb-section-title">
            Loved by <span className="sb-accent">MCP App builders</span>
          </h2>
        </div>
        <SBQuotesBody quotes={quotes} variant={quotesVariant} />
      </div>
    </section>
  );
}

function XIcon() {
  return (
    <span className="sb-quotes-tweet-bird" aria-hidden>
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    </span>
  );
}

export function SBQuotesBody({
  quotes,
  variant = "cards",
}: {
  quotes: Quote[];
  variant?: QuotesVariant;
}) {
  // L · Social cards — generic, quote-first, photo + name + role
  if (variant === "social") {
    return (
      <div className="sb-quotes-social">
        {quotes.map((q, i) => (
          <article key={q.who} className="sb-quotes-social-card">
            <header className="sb-quotes-social-h">
              <div
                className="sb-quotes-social-avatar"
                data-i={i % 4}
                aria-hidden
              >
                {q.photo ? (
                  <img src={q.photo} alt="" loading="lazy" />
                ) : (
                  <span>
                    {q.who
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="sb-quotes-social-id">
                <div className="sb-quotes-social-name">{q.who}</div>
                <div className="sb-quotes-social-role">{q.where}</div>
              </div>
            </header>
            <p className="sb-quotes-social-q">{q.q}</p>
          </article>
        ))}
      </div>
    );
  }

  // I · Twitter/X feed
  if (variant === "tweets") {
    const handles = [
      "@yannleflour",
      "@marcpetit",
      "@kira_t",
      "@sashariv",
      "@devbui",
      "@iva_n",
    ];
    return (
      <div className="sb-quotes-tweets">
        {quotes.map((q, i) => (
          <article key={q.who} className="sb-quotes-tweet">
            <header className="sb-quotes-tweet-h">
              <div
                className="sb-quotes-tweet-avatar"
                data-i={i % 4}
                aria-hidden
              >
                <span>
                  {q.who
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
              <div className="sb-quotes-tweet-id">
                <div className="sb-quotes-tweet-name">
                  <span>{q.who}</span>
                  {i < 3 && (
                    <span
                      className="sb-quotes-tweet-verified"
                      aria-label="verified"
                    >
                      <svg
                        viewBox="0 0 22 22"
                        width="14"
                        height="14"
                        aria-hidden
                      >
                        <path
                          fill="#1d9bf0"
                          d="M20.4 11l-1.6-1.8.2-2.4-2.3-.5-1.2-2.1-2.3.6L11 3.6l-1.7 1.4-2.4-.6-1.2 2.1-2.3.5.2 2.4L1.7 11l1.6 1.8-.2 2.4 2.3.5 1.2 2.1 2.4-.6L11 18.4l1.8 1.4 2.3-.6 1.2-2.1 2.3-.5-.2-2.4 1.7-1.8zm-11.6 3.5L5.6 11.3l1.5-1.5 1.7 1.7 4.7-4.7 1.5 1.5-6.2 6.2z"
                        />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="sb-quotes-tweet-handle">
                  <span>{handles[i] || "@dev"}</span>
                  <span className="sep" aria-hidden>
                    ·
                  </span>
                  <span>{["2h", "5h", "1d", "2d", "3d", "1w"][i] || "1w"}</span>
                </div>
              </div>
              <XIcon />
            </header>
            <p className="sb-quotes-tweet-body">{q.q}</p>
            <footer className="sb-quotes-tweet-actions" aria-hidden>
              <span className="sb-quotes-tweet-action">
                <svg viewBox="0 0 24 24" width="15" height="15">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    d="M4 5h16v11H7l-3 3z"
                  />
                </svg>
                <span>{12 + i * 7}</span>
              </span>
              <span className="sb-quotes-tweet-action">
                <svg viewBox="0 0 24 24" width="15" height="15">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    d="M7 7h11l-2-2m2 2l-2 2M17 17H6l2 2m-2-2l2-2"
                  />
                </svg>
                <span>{34 + i * 5}</span>
              </span>
              <span className="sb-quotes-tweet-action">
                <svg viewBox="0 0 24 24" width="15" height="15">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"
                  />
                </svg>
                <span>{120 + i * 23}</span>
              </span>
            </footer>
          </article>
        ))}
      </div>
    );
  }

  // J · LinkedIn-style posts
  if (variant === "linkedin") {
    return (
      <div className="sb-quotes-linkedin">
        {quotes.map((q, i) => (
          <article key={q.who} className="sb-quotes-li-post">
            <header className="sb-quotes-li-h">
              <div className="sb-quotes-li-avatar" data-i={i % 4} aria-hidden>
                <span>
                  {q.who
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
              <div className="sb-quotes-li-id">
                <div className="sb-quotes-li-name">{q.who}</div>
                <div className="sb-quotes-li-role">{q.where}</div>
                <div className="sb-quotes-li-meta">
                  <span>{["2h", "5h", "1d", "2d", "3d", "1w"][i] || "1w"}</span>
                  <span aria-hidden>·</span>
                  <span className="sb-quotes-li-globe" aria-hidden>
                    <svg viewBox="0 0 16 16" width="11" height="11">
                      <circle
                        cx="8"
                        cy="8"
                        r="6.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <path
                        d="M2 8h12M8 1.5c2 2 2 11 0 13M8 1.5c-2 2-2 11 0 13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </header>
            <p className="sb-quotes-li-body">{q.q}</p>
            <footer className="sb-quotes-li-foot" aria-hidden>
              <span className="sb-quotes-li-reactions">
                <span className="sb-quotes-li-react sb-quotes-li-react-like">
                  👍
                </span>
                <span className="sb-quotes-li-react sb-quotes-li-react-clap">
                  👏
                </span>
                <span className="sb-quotes-li-react sb-quotes-li-react-heart">
                  ❤
                </span>
                <span className="sb-quotes-li-react-count">
                  {[241, 187, 432, 96, 152, 88][i] || 100}
                </span>
              </span>
              <span className="sb-quotes-li-comments">
                {[24, 12, 41, 6, 18, 9][i] || 10} comments
              </span>
            </footer>
          </article>
        ))}
      </div>
    );
  }

  // K · Conversation thread
  if (variant === "thread") {
    const handles = [
      "@yannleflour",
      "@marcpetit",
      "@kira_t",
      "@sashariv",
      "@devbui",
      "@iva_n",
    ];
    return (
      <div className="sb-quotes-thread">
        {quotes.map((q, i) => (
          <article
            key={q.who}
            className={`sb-quotes-thread-msg ${i === 0 ? "is-root" : ""}`}
          >
            <div className="sb-quotes-thread-rail" aria-hidden>
              <div className="sb-quotes-thread-avatar" data-i={i % 4}>
                <span>
                  {q.who
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
              {i < quotes.length - 1 && (
                <div className="sb-quotes-thread-line"></div>
              )}
            </div>
            <div className="sb-quotes-thread-body">
              <div className="sb-quotes-thread-h">
                <span className="sb-quotes-thread-name">{q.who}</span>
                <span className="sb-quotes-thread-handle">
                  {handles[i] || "@dev"}
                </span>
                <span className="sb-quotes-thread-sep" aria-hidden>
                  ·
                </span>
                <span className="sb-quotes-thread-time">
                  {["2h", "5h", "1d", "2d", "3d", "1w"][i] || "1w"}
                </span>
                {i > 0 && (
                  <span className="sb-quotes-thread-replying">
                    replying to <span>{quotes[0].who.split(" ")[0]}</span>
                  </span>
                )}
              </div>
              <p className="sb-quotes-thread-q">{q.q}</p>
              <div className="sb-quotes-thread-actions" aria-hidden>
                <span>↩ {3 + i}</span>
                <span>♺ {12 + i * 4}</span>
                <span>♡ {48 + i * 11}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  // E · Spotlight — one big featured quote, two smaller flanking
  if (variant === "spotlight") {
    const [hero, ...rest] = quotes;
    return (
      <div className="sb-quotes-spot">
        <figure className="sb-quotes-spot-hero">
          <div className="sb-quotes-spot-rule" aria-hidden></div>
          <blockquote className="sb-quotes-spot-q">{hero.q}</blockquote>
          <figcaption className="sb-quotes-spot-attr">
            <div className="sb-quote-avatar" />
            <div>
              <div className="sb-quote-who">{hero.who}</div>
              <div className="sb-quote-where">{hero.where}</div>
            </div>
          </figcaption>
        </figure>
        <div className="sb-quotes-spot-side">
          {rest.slice(0, 4).map((q) => (
            <figure key={q.who} className="sb-quotes-spot-mini">
              <blockquote>"{q.q}"</blockquote>
              <figcaption>
                <span className="sb-quote-who">{q.who}</span>
                <span className="sb-quote-where">{q.where}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  }

  // F · Stack — full-width quotes, alternating alignment, no card chrome
  if (variant === "stack") {
    return (
      <div className="sb-quotes-stack">
        {quotes.map((q, i) => (
          <figure
            key={q.who}
            className={`sb-quotes-stack-item ${i % 2 ? "right" : "left"}`}
          >
            <span className="sb-quotes-stack-num" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <blockquote className="sb-quotes-stack-q">{q.q}</blockquote>
            <figcaption className="sb-quotes-stack-attr">
              <span>{q.who}</span>
              <span className="sep" aria-hidden>
                ·
              </span>
              <span className="muted">{q.where}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  // G · Terminal — quotes styled like dev terminal log lines
  if (variant === "terminal") {
    const handles = [
      "@yann.l",
      "@marc.p",
      "@kira.t",
      "@sasha.r",
      "@dev.bui",
      "@iva.n",
    ];
    return (
      <div className="sb-quotes-term">
        <div className="sb-quotes-term-chrome">
          <span
            className="sb-demo-code-dot"
            style={{ background: "#ff6159" }}
          />
          <span
            className="sb-demo-code-dot"
            style={{ background: "#ffbd2e" }}
          />
          <span
            className="sb-demo-code-dot"
            style={{ background: "#27c93f" }}
          />
          <span className="sb-quotes-term-file">~/builders.log</span>
        </div>
        <div className="sb-quotes-term-body">
          {quotes.map((q, i) => (
            <div key={q.who} className="sb-quotes-term-line">
              <span className="sb-quotes-term-prompt">$</span>
              <span className="sb-quotes-term-handle">
                {handles[i] || "@dev"}
              </span>
              <span className="sb-quotes-term-arrow" aria-hidden>
                ›
              </span>
              <span className="sb-quotes-term-quote">{q.q}</span>
              <span className="sb-quotes-term-meta">
                — {q.who.split(" ")[0].toLowerCase()} ·{" "}
                {q.where.replace(/^[^·]+·\s*/, "")}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // H · Stickers — overlapping rotated cards on a wall
  if (variant === "stickers") {
    const tilts = [-3, 2, -1, 3, -2, 1];
    const tints: StickerTint[] = [
      "cyan",
      "lime",
      "pink",
      "plain",
      "cyan",
      "lime",
    ];
    return (
      <div className="sb-quotes-stickers">
        {quotes.map((q, i) => (
          <figure
            key={q.who}
            className={`sb-quotes-sticker tint-${tints[i] || "plain"}`}
            style={{ transform: `rotate(${tilts[i] || 0}deg)` }}
          >
            <span className="sb-quotes-sticker-tape" aria-hidden></span>
            <blockquote>"{q.q}"</blockquote>
            <figcaption>
              <div className="sb-quote-who">{q.who}</div>
              <div className="sb-quote-where">{q.where}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  // default: original cards layout (1 hero + 5 small)
  return (
    <div className="sb-quote-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="sb-quote">
          <div className="sb-quote-mark">"</div>
          <p>{quotes[0].q}</p>
          <div className="sb-quote-attr">
            <div className="sb-quote-avatar" />
            <div>
              <div className="sb-quote-who">{quotes[0].who}</div>
              <div className="sb-quote-where">{quotes[0].where}</div>
            </div>
          </div>
        </div>
        {quotes.slice(1, 3).map((q) => (
          <div className="sb-quote small" key={q.who}>
            <p>"{q.q}"</p>
            <div className="sb-quote-attr">
              <div className="sb-quote-avatar" />
              <div>
                <div className="sb-quote-who">{q.who}</div>
                <div className="sb-quote-where">{q.where}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {quotes.slice(3, 6).map((q) => (
          <div className="sb-quote small" key={q.who}>
            <p>"{q.q}"</p>
            <div className="sb-quote-attr">
              <div className="sb-quote-avatar" />
              <div>
                <div className="sb-quote-who">{q.who}</div>
                <div className="sb-quote-where">{q.where}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
