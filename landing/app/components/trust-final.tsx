import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icons";

export type TrustVariant = "cards" | "inline" | "editorial" | "meter";
export type CommunityVariant = "cards" | "inline" | "segmented" | "hero";

type CommunityLink = {
  key: string;
  href: string;
  label: string;
  sub: string;
  handle: string;
  badge: string;
  icon: ReactNode;
  iconStyle: CSSProperties | null;
};

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-7-6.2 7H1.5l8-9.1L1 2h7l4.9 6.4L18.9 2zm-1.2 18h1.9L7.5 4H5.4l12.3 16z" />
  </svg>
);

const COMMUNITY_LINKS: CommunityLink[] = [
  {
    key: "github",
    href: "https://github.com/alpic-ai/skybridge/blob/main/CONTRIBUTING.md",
    label: "Contribute on GitHub",
    sub: "Open a PR, file an issue",
    handle: "@alpic-ai/skybridge",
    badge: "1K+ stars",
    icon: <Icon name="github" size={22} />,
    iconStyle: null,
  },
  {
    key: "discord",
    href: "#",
    label: "Discord",
    sub: "Chat with the team",
    handle: "discord.gg/skybridge",
    badge: "420 online",
    icon: <Icon name="discord" size={22} />,
    iconStyle: {
      background: "#5865f2",
      borderColor: "transparent",
      color: "#fff",
    },
  },
  {
    key: "x",
    href: "#",
    label: "X / Twitter",
    sub: "Follow for updates",
    handle: "@skybridgedev",
    badge: "Follow",
    icon: <XIcon size={20} />,
    iconStyle: {
      background: "#000",
      borderColor: "transparent",
      color: "#fff",
    },
  },
];

export function SBFinal({
  finalBg = "glow",
}: {
  finalBg?: "glow" | "aurora" | "mountain" | "grid" | "panel";
}) {
  return (
    <section
      className={`sb-final sb-final--${finalBg}`}
      data-final-bg={finalBg}
    >
      {finalBg === "aurora" && (
        <div className="sb-final-aurora" aria-hidden></div>
      )}
      {finalBg === "mountain" && (
        <div className="sb-final-mountain" aria-hidden></div>
      )}
      {finalBg === "grid" && <div className="sb-final-grid" aria-hidden></div>}
      {finalBg === "panel" && (
        <div className="sb-final-panel-shape" aria-hidden></div>
      )}
      <div className="sb-wrap">
        <h2 style={{ fontWeight: "400" }}>
          Ship your first
          <br />
          <span
            className="sb-accent"
            style={{
              background:
                "linear-gradient(100deg, var(--sb-accent), var(--sb-lime))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MCP app today.
          </span>
        </h2>
        <div className="sb-final-cta">
          <a
            className="sb-btn sb-btn-primary sb-btn-lg"
            href="https://skybridge.tech/home"
          >
            Read the docs
            <Icon name="arrow" size={15} stroke={2} />
          </a>
          <a
            className="sb-btn sb-btn-ghost sb-btn-lg"
            href="#"
            style={{ borderRadius: "10px", borderColor: "rgb(106, 177, 177)" }}
          >
            <Icon name="github" size={14} />
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

export function SBFooter() {
  return (
    <footer className="sb-footer">
      <div className="sb-wrap">
        <div className="sb-footer-inner">
          <div className="sb-footer-brand">
            <img
              src="/assets/skybridge-white.svg"
              alt="Skybridge"
              className="sb-footer-logo"
            />
            <p>
              The full-stack React framework for MCP Apps. An open-source
              project by made Alpic, in Paris.
            </p>
          </div>
          <div>
            <h4>FRAMEWORK</h4>
            <a href="#">Docs</a>
            <a href="/showcase">Showcase</a>
            <a href="#">Examples</a>
          </div>
          <div>
            <h4>Resources</h4>
            <a href="#">MCP spec</a>
            <a href="#">Alpic blog</a>
          </div>
          <div>
            <h4>Community</h4>
            <a href="#">GitHub</a>
            <a href="#">Discord</a>
            <a href="#">X / Twitter</a>
            <a href="#">Contribute</a>
          </div>
        </div>
        <div className="sb-footer-bot">
          <span>© 2026 Alpic · Skybridge is open source (MIT)</span>
          <span>Made in Paris · with Taste</span>
        </div>
      </div>
    </footer>
  );
}

export function SBTrust({
  trustVariant = "cards",
  communityVariant = "cards",
}: {
  trustVariant?: TrustVariant;
  communityVariant?: CommunityVariant;
}) {
  return (
    <>
      {/* === Part 1: Expertise / Trusted at scale — 2 big cards === */}
      <section
        className="sb-section"
        id="trust"
        style={{ paddingTop: 80, paddingBottom: 80 }}
      >
        <div className="sb-wrap">
          <div
            className="sb-section-header"
            style={{ textAlign: "center", margin: "0 auto" }}
          >
            <div className="sb-section-eyebrow">
              Built by MCP Apps contributors
            </div>
            <h2 className="sb-section-title">
              Trusted at <span className="sb-accent">scale</span>
            </h2>
            <p className="sb-section-sub" style={{ margin: "16px auto 0" }}>
              Recommended in the{" "}
              <a
                href="https://platform.openai.com/docs/mcp"
                target="_blank"
                rel="noopener noreferrer"
                className="sb-inline-link"
              >
                OpenAI documentation
              </a>{" "}
              and{" "}
              <a
                href="https://developers.openai.com/blog/15-lessons-building-chatgpt-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="sb-inline-link"
              >
                Developers blog
              </a>
              , we're active contributors to the official MCP Apps extension.
              Everything we learn building real MCP Apps goes straight back into
              the framework.
            </p>
          </div>
          <SBTrustStats variant={trustVariant} />
        </div>
      </section>

      {/* === Part 2: Open source & community — 2 big cards === */}
      <section
        className="sb-section"
        id="community"
        style={{ paddingTop: 40, paddingBottom: 104 }}
      >
        <div className="sb-wrap">
          <div
            className="sb-section-header"
            style={{ textAlign: "center", margin: "0 auto" }}
          >
            <div className="sb-section-eyebrow">Open source</div>
            <h2 className="sb-section-title">
              Built in the <span className="sb-accent">open</span>
            </h2>
            <p className="sb-section-sub" style={{ margin: "16px auto 0" }}>
              Every line of Skybridge is MIT-licensed and shaped by the MCP app
              developers who use it. Jump in, open a PR, or hang out with the
              community.
            </p>
          </div>
          <SBCommunityLinks variant={communityVariant} />
        </div>
      </section>
    </>
  );
}

export function SBTrustStats({
  variant = "cards",
}: {
  variant?: TrustVariant;
}) {
  if (variant === "inline") {
    return (
      <div className="sb-trust-inline">
        <div className="sb-trust-inline-row">
          <span className="sb-trust-inline-num">100K</span>
          <span className="sb-trust-inline-lbl">monthly npm downloads</span>
          <span className="sb-trust-inline-sep" aria-hidden>
            •
          </span>
          <span className="sb-trust-inline-num">1K+</span>
          <span className="sb-trust-inline-lbl">GitHub stars</span>
          <span className="sb-trust-inline-sep" aria-hidden>
            •
          </span>
          <span className="sb-trust-inline-num">MIT</span>
          <span className="sb-trust-inline-lbl">licensed</span>
        </div>
      </div>
    );
  }
  if (variant === "editorial") {
    return (
      <div className="sb-trust-editorial">
        <div className="sb-trust-editorial-num">
          <span className="sb-trust-editorial-big">100K</span>
          <span className="sb-trust-editorial-cap">monthly npm downloads</span>
        </div>
        <div className="sb-trust-editorial-side">
          <div className="sb-trust-editorial-row">
            <span className="sb-trust-editorial-rownum">1K+</span>
            <span className="sb-trust-editorial-rowlbl">GitHub stars</span>
          </div>
          <div className="sb-trust-editorial-divider" aria-hidden></div>
          <div className="sb-trust-editorial-row">
            <span className="sb-trust-editorial-rownum">MIT</span>
            <span className="sb-trust-editorial-rowlbl">
              Open source license
            </span>
          </div>
          <div className="sb-trust-editorial-divider" aria-hidden></div>
          <div className="sb-trust-editorial-row">
            <span className="sb-trust-editorial-rownum">v1.0</span>
            <span className="sb-trust-editorial-rowlbl">Production ready</span>
          </div>
        </div>
      </div>
    );
  }
  if (variant === "meter") {
    return (
      <div className="sb-trust-meter">
        <div className="sb-trust-meter-card">
          <div className="sb-trust-meter-head">
            <span className="sb-trust-meter-num">100K</span>
            <span className="sb-trust-meter-lbl">monthly npm downloads</span>
          </div>
          <svg
            className="sb-trust-meter-graph"
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="sbtmGrad1" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="var(--sb-ice)" stopOpacity="0.0" />
                <stop
                  offset="100%"
                  stopColor="var(--sb-ice)"
                  stopOpacity="0.55"
                />
              </linearGradient>
            </defs>
            <path
              d="M0,52 L14,49 L28,46 L42,44 L56,40 L70,38 L84,33 L98,28 L112,22 L126,18 L140,14 L154,11 L168,8 L182,6 L200,4 L200,60 L0,60 Z"
              fill="url(#sbtmGrad1)"
            />
            <path
              d="M0,52 L14,49 L28,46 L42,44 L56,40 L70,38 L84,33 L98,28 L112,22 L126,18 L140,14 L154,11 L168,8 L182,6 L200,4"
              fill="none"
              stroke="var(--sb-ice)"
              strokeWidth="1.5"
            />
          </svg>
          <div className="sb-trust-meter-foot">Last 12 months</div>
        </div>
        <div className="sb-trust-meter-card">
          <div className="sb-trust-meter-head">
            <span className="sb-trust-meter-num">1K+</span>
            <span className="sb-trust-meter-lbl">GitHub stars</span>
          </div>
          <div className="sb-trust-meter-bars" aria-hidden>
            {[24, 32, 28, 40, 36, 48, 44, 56, 60, 68, 72, 84].map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="sb-trust-meter-foot">
            github.com/alpic-ai/skybridge
          </div>
        </div>
      </div>
    );
  }
  // default: original cards
  return (
    <div className="sb-trust-stats">
      <div className="sb-trust-stat">
        <div className="sb-trust-stat-num">100K</div>
        <div className="sb-trust-stat-lbl">Monthly npm downloads</div>
      </div>
      <div className="sb-trust-stat">
        <div className="sb-trust-stat-num">1K+</div>
        <div className="sb-trust-stat-lbl">GitHub stars</div>
      </div>
    </div>
  );
}

export function SBCommunityLinks({
  variant = "cards",
}: {
  variant?: CommunityVariant;
}) {
  if (variant === "inline") {
    return (
      <div className="sb-community-inline">
        {COMMUNITY_LINKS.map((l) => (
          <a
            key={l.key}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="sb-community-inline-link"
          >
            <span
              className="sb-community-inline-icon"
              style={l.iconStyle || undefined}
            >
              {l.icon}
            </span>
            <span className="sb-community-inline-text">
              <span className="sb-community-inline-label">{l.label}</span>
              <span className="sb-community-inline-handle">{l.handle}</span>
            </span>
            <Icon name="arrow" size={16} />
          </a>
        ))}
      </div>
    );
  }
  if (variant === "segmented") {
    return (
      <div className="sb-community-segmented">
        {COMMUNITY_LINKS.map((l) => (
          <a
            key={l.key}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="sb-community-seg"
          >
            <span
              className="sb-community-seg-icon"
              style={l.iconStyle || undefined}
            >
              {l.icon}
            </span>
            <span className="sb-community-seg-text">
              <span className="sb-community-seg-label">{l.label}</span>
              <span className="sb-community-seg-sub">{l.sub}</span>
            </span>
          </a>
        ))}
      </div>
    );
  }
  if (variant === "hero") {
    const [primary, ...rest] = COMMUNITY_LINKS;
    return (
      <div className="sb-community-hero">
        <a
          href={primary.href}
          target="_blank"
          rel="noopener noreferrer"
          className="sb-community-hero-card"
        >
          <div
            className="sb-community-hero-icon"
            style={primary.iconStyle || undefined}
          >
            {primary.icon}
          </div>
          <div className="sb-community-hero-text">
            <div className="sb-community-hero-eyebrow">
              Skybridge is open source
            </div>
            <div className="sb-community-hero-label">Contribute on GitHub</div>
            <div className="sb-community-hero-sub">
              Open a PR, file an issue, or just star the repo to follow along.
            </div>
          </div>
          <div className="sb-community-hero-cta">
            <span className="sb-community-hero-stars">★ 1K+</span>
            <span className="sb-community-hero-arrow">
              <Icon name="arrow" size={16} />
            </span>
          </div>
        </a>
        <div className="sb-community-hero-row">
          {rest.map((l) => (
            <a
              key={l.key}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="sb-community-hero-chip"
            >
              <span
                className="sb-community-hero-chip-icon"
                style={l.iconStyle || undefined}
              >
                {l.icon}
              </span>
              <span className="sb-community-hero-chip-text">
                <span className="sb-community-hero-chip-label">{l.label}</span>
                <span className="sb-community-hero-chip-handle">
                  {l.handle}
                </span>
              </span>
              <Icon name="arrow" size={14} />
            </a>
          ))}
        </div>
      </div>
    );
  }
  // default: original cards
  return (
    <div className="sb-community-grid">
      {COMMUNITY_LINKS.map((l) => (
        <a
          key={l.key}
          className="sb-community-card"
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="sb-community-icon" style={l.iconStyle || undefined}>
            {l.icon}
          </div>
          <div className="sb-community-label">{l.label}</div>
          <div className="sb-community-sub">{l.sub}</div>
        </a>
      ))}
    </div>
  );
}
