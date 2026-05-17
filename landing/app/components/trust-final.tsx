import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icons";

type CommunityLink = {
  href: string;
  label: string;
  subtitle: string;
  icon: ReactNode;
  iconStyle?: CSSProperties;
};

const COMMUNITY_LINKS: CommunityLink[] = [
  {
    href: "https://github.com/alpic-ai/skybridge/blob/main/CONTRIBUTING.md",
    label: "Contribute on GitHub",
    subtitle: "Open a PR, file an issue",
    icon: <Icon name="github" size={22} />,
  },
  {
    href: "https://discord.gg/awV4gu74wK",
    label: "Discord",
    subtitle: "Chat with the team",
    icon: <Icon name="discord" size={22} />,
    iconStyle: {
      background: "#5865f2",
      borderColor: "transparent",
      color: "#fff",
    },
  },
  {
    href: "https://x.com/skybridgedev",
    label: "X",
    subtitle: "Follow updates",
    icon: <Icon name="x" size={18} />,
    iconStyle: {
      background: "#000",
      borderColor: "transparent",
      color: "#fff",
    },
  },
];

export function FinalCtaSection() {
  return (
    <section className="sb-final sb-final--aurora" data-final-bg="aurora">
      <div className="sb-final-aurora" aria-hidden></div>
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
            href="https://docs.skybridge.tech"
          >
            Read the docs
            <Icon name="arrow" size={15} stroke={2} />
          </a>
          <a
            className="sb-btn sb-btn-ghost sb-btn-lg"
            href="https://github.com/alpic-ai/skybridge"
            target="_blank"
            rel="noopener noreferrer"
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

export function SiteFooter() {
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
            <p>An open-source project made with taste in Paris. © Alpic 2026</p>
          </div>
          <div>
            <h4>FRAMEWORK</h4>
            <a href="https://docs.skybridge.tech">Docs</a>
            <a href="/showcase">Showcase</a>
            <a href="https://docs.skybridge.tech/showcase">Examples</a>
          </div>
          <div>
            <h4>Resources</h4>
            <a href="https://modelcontextprotocol.io">MCP spec</a>
            <a href="https://alpic.ai/blog">Alpic blog</a>
          </div>
          <div>
            <h4>Community</h4>
            <a href="https://github.com/alpic-ai/skybridge">GitHub</a>
            <a href="https://discord.gg/awV4gu74wK">Discord</a>
            <a href="https://github.com/alpic-ai/skybridge/blob/main/CONTRIBUTING.md">
              Contribute
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function TrustSection() {
  return (
    <>
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
        </div>
      </section>

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
          <div className="sb-community-segmented">
            {COMMUNITY_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="sb-community-seg"
              >
                <span className="sb-community-seg-icon" style={link.iconStyle}>
                  {link.icon}
                </span>
                <span className="sb-community-seg-text">
                  <span className="sb-community-seg-label">{link.label}</span>
                  <span className="sb-community-seg-sub">{link.subtitle}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
