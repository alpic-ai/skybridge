"use client";

import Image from "next-image-export-optimizer";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

type AuditRow = {
  icon: string;
  title: string;
  list: { code: string; text: string }[];
};

type AuditSectionProps = {
  tone: "warn" | "err" | "ok";
  label: string;
  count: number;
  host?: string;
  row: AuditRow;
};

const AuditSection = ({ tone, label, count, host, row }: AuditSectionProps) => (
  <div className="sb-dp-aud-section">
    <div className="sb-dp-aud-section-h">
      <span className="sb-dp-aud-section-label">{label}</span>
      <span className={`sb-dp-aud-dot ${tone}`} aria-hidden></span>
      <span className="sb-dp-aud-count">{count}</span>
      {host && <span className="sb-dp-aud-host">{host}</span>}
    </div>
    <div className={`sb-dp-aud-row ${tone}`}>
      <span className="sb-dp-aud-icon" aria-hidden>
        {row.icon}
      </span>
      <div className="sb-dp-aud-row-body">
        <div className="sb-dp-aud-row-title">{row.title}</div>
        <div className="sb-dp-aud-row-bar">
          <div className="sb-dp-aud-row-list">
            {row.list.map((item) => (
              <div key={item.code}>
                <code>{item.code}</code> <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const JSON_FIELDS: {
  key: string;
  val: string | number;
  kind: "str" | "num";
}[] = [
  { key: "flight", val: "AF 276", kind: "str" },
  { key: "from", val: "CDG", kind: "str" },
  { key: "to", val: "HND", kind: "str" },
  { key: "dep", val: "10:25", kind: "str" },
  { key: "arr", val: "06:40+1", kind: "str" },
  { key: "stops", val: 0, kind: "num" },
  { key: "price", val: "$891", kind: "str" },
];

const TerminalDots = () => (
  <>
    <span className="sb-devtools-dot" style={{ background: "#ff6159" }} />
    <span className="sb-devtools-dot" style={{ background: "#ffbd2e" }} />
    <span className="sb-devtools-dot" style={{ background: "#27c93f" }} />
  </>
);

function DevPanel({
  hover,
  auditKey,
}: {
  hover: string | null;
  auditKey: number;
}) {
  return (
    <div className="sb-devpanel" aria-hidden="true">
      {/* HMR */}
      <div
        className={`sb-devpanel-card sb-dp-hmr ${hover === "hmr" ? "is-on" : ""}`}
      >
        <div className="sb-dp-diff">
          <div className="sb-dp-diff-header">
            <span className="sb-dp-diff-file">view.tsx</span>
          </div>
          <div className="sb-dp-diff-body">
            <div className="sb-dp-diff-line sb-dp-diff-ctx">
              <span className="sb-dp-diff-sign"> </span>
              <span className="sb-dp-diff-line-content">
                <span className="sb-c-kw">const</span>{" "}
                <span className="sb-c-punc">{"{"}</span>{" "}
                <span className="sb-c-var">output</span>{" "}
                <span className="sb-c-punc">{"}"}</span>{" "}
                <span className="sb-c-punc">=</span>{" "}
                <span className="sb-c-fn">useToolInfo</span>
                <span className="sb-c-punc">&lt;</span>
                <span className="sb-c-str">"searchFlights"</span>
                <span className="sb-c-punc">&gt;()</span>
              </span>
            </div>
            <div className="sb-dp-diff-line sb-dp-diff-del">
              <span className="sb-dp-diff-sign">−</span>
              <span className="sb-dp-diff-line-content">
                <span className="sb-c-tag">&lt;FlightCard</span>{" "}
                <span className="sb-c-var">flight</span>
                <span className="sb-c-punc">
                  ={"{"}output{"}"}
                </span>{" "}
                <span className="sb-c-tag">/&gt;</span>
              </span>
            </div>
            <div className="sb-dp-diff-line sb-dp-diff-add">
              <span className="sb-dp-diff-sign">+</span>
              <span className="sb-dp-diff-line-content">
                <span className="sb-c-tag">&lt;FlightCard</span>{" "}
                <span className="sb-c-var">flight</span>
                <span className="sb-c-punc">
                  ={"{"}output{"}"}
                </span>{" "}
                <span className="sb-c-var">highlight</span>{" "}
                <span className="sb-c-tag">/&gt;</span>
                <span className="sb-dp-diff-caret" aria-hidden />
              </span>
            </div>
            <div className="sb-dp-diff-line sb-dp-diff-ctx">
              <span className="sb-dp-diff-sign"> </span>
              <span className="sb-dp-diff-line-content">
                <span className="sb-c-tag">&lt;BookButton</span>{" "}
                <span className="sb-c-var">flight</span>
                <span className="sb-c-punc">
                  ={"{"}output{"}"}
                </span>{" "}
                <span className="sb-c-tag">/&gt;</span>
              </span>
            </div>
          </div>
        </div>
        <div className="sb-dp-diff-arrow">
          <span className="sb-dp-diff-arrow-glyph">↓</span>
          <span className="sb-dp-diff-arrow-beam" aria-hidden />
        </div>
        <div className="sb-dp-widget">
          <div className="sb-dp-widget-flash" aria-hidden />
          <div className="sb-dp-widget-highlight-row">
            <span className="sb-dp-widget-pill">✦ Best fare</span>
            <strong className="sb-dp-widget-price">$891</strong>
          </div>
          <div className="sb-dp-widget-row sub" style={{ marginTop: 6 }}>
            <span>CDG → HND · AF 276</span>
            <span>11h 15m</span>
          </div>
          <div className="sb-dp-widget-btn">Book AF 276 →</div>
        </div>
      </div>

      {/* Emulator */}
      <div
        className={`sb-devpanel-card sb-dp-emu ${hover === "emulator" ? "is-on" : ""}`}
      >
        <div className="sb-dp-dt-urlbar">
          <Icon name="globe" size={9} />
          <span>localhost:3000</span>
          <span className="sb-dp-dt-urlbar-sep">·</span>
          <span className="sb-dp-dt-urlbar-title">Skybridge DevTools</span>
        </div>

        <div className="sb-dp-dt-chrome">
          <div className="sb-dp-dt-brand">
            <span className="sb-dp-dt-logo">▲</span>
            <span className="sb-dp-dt-name">my-app</span>
            <span className="sb-dp-dt-ver">0.0.1</span>
          </div>
          <div className="sb-dp-dt-tabs">
            <span className="sb-dp-dt-tab">Tunnel</span>
            <span className="sb-dp-dt-tab">Playground</span>
            <span className="sb-dp-dt-tab">Audit</span>
          </div>
        </div>

        <div className="sb-dp-dt-body">
          <div className="sb-dp-dt-side">
            <div className="sb-dp-dt-side-h">Tools</div>
            <div className="sb-dp-dt-tool">
              <span className="sb-dp-dt-run">▶</span> search_flights
            </div>
            <button className="sb-dp-dt-run-btn">Run</button>
          </div>
          <div className="sb-dp-dt-output">
            <div className="sb-dp-dt-output-h">Tool output</div>
            <div className="sb-dp-dt-json">
              <span className="sb-c-punc">{"{"}</span>
              {JSON_FIELDS.map(({ key, val, kind }, i) => (
                <div className="sb-dp-dt-json-line" key={key}>
                  <span className="sb-c-var">"{key}"</span>
                  <span className="sb-c-punc">: </span>
                  <span className={`sb-c-${kind}`}>
                    {kind === "str" ? `"${val}"` : val}
                  </span>
                  {i < JSON_FIELDS.length - 1 && (
                    <span className="sb-c-punc">,</span>
                  )}
                </div>
              ))}
              <span className="sb-c-punc">{"}"}</span>
            </div>
          </div>
        </div>

        {/* Preview cycles through inline / mobile via CSS animation */}
        <div className="sb-dp-dt-preview">
          <div className="sb-dp-dt-controls">
            <span className="sb-dp-dt-ctrl sb-dp-dt-mode sb-dp-dt-mode-inline">
              inline
            </span>
            <span className="sb-dp-dt-ctrl sb-dp-dt-mode sb-dp-dt-mode-mobile">
              mobile
            </span>
            <span className="sb-dp-dt-ctrl-sep" aria-hidden>
              ·
            </span>
            <span className="sb-dp-dt-theme-stack">
              <span className="sb-dp-dt-theme-ind sb-dp-dt-theme-dark">
                ☾ dark
              </span>
              <span className="sb-dp-dt-theme-ind sb-dp-dt-theme-light">
                ☼ light
              </span>
            </span>
          </div>
          <div className="sb-dp-dt-stage">
            <div className="sb-dp-dt-widget-wrap">
              <div className="sb-dp-dt-flight">
                <div className="sb-dp-dt-flight-route">
                  Paris <span className="sb-c-punc">→</span> Tokyo
                </div>
                <div className="sb-dp-dt-flight-row">
                  <span>AF 276 · Nonstop · 11h 15m</span>
                  <strong>$891</strong>
                </div>
                <button className="sb-dp-dt-flight-book">Book AF 276</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tunnel */}
      <div
        className={`sb-devpanel-card sb-dp-tun ${hover === "tunnel" ? "is-on" : ""}`}
      >
        <div className="sb-dp-tun-source">
          <div className="sb-dp-tun-laptop-frame">
            <div className="sb-dp-tun-laptop">
              <div className="sb-dp-tun-laptop-chrome">
                <span />
                <span />
                <span />
              </div>
              <div className="sb-dp-tun-widget">
                <div className="sb-dp-tun-widget-row">
                  <span>Paris → Tokyo</span>
                  <strong>$891</strong>
                </div>
                <div className="sb-dp-tun-widget-row sub">
                  <span>AF 276 · Nonstop</span>
                  <span>11h 15m</span>
                </div>
              </div>
            </div>
            <div className="sb-dp-tun-laptop-base" aria-hidden />
          </div>
          <div className="sb-dp-tun-url">
            <Icon name="globe" size={10} />
            <span>cool-marmot.alpic.dev/mcp</span>
          </div>
        </div>

        <div className="sb-dp-tun-link">
          <svg
            className="sb-dp-tun-svg"
            viewBox="0 0 130 220"
            aria-hidden="true"
          >
            <path
              className="sb-dp-tun-path"
              d="M 0 110 L 40 110 C 70 110 70 30 130 30"
            />
            <path
              className="sb-dp-tun-path"
              d="M 0 110 L 40 110 C 70 110 70 190 130 190"
            />
            <path
              className="sb-dp-tun-flow"
              d="M 0 110 L 40 110 C 70 110 70 30 130 30"
            />
            <path
              className="sb-dp-tun-flow"
              d="M 0 110 L 40 110 C 70 110 70 190 130 190"
            />
          </svg>
          <div className="sb-dp-tun-packet sb-dp-tun-packet-top sb-dp-tun-packet-1" />
          <div className="sb-dp-tun-packet sb-dp-tun-packet-top sb-dp-tun-packet-2" />
          <div className="sb-dp-tun-packet sb-dp-tun-packet-top sb-dp-tun-packet-3" />
          <div className="sb-dp-tun-packet sb-dp-tun-packet-bot sb-dp-tun-packet-1" />
          <div className="sb-dp-tun-packet sb-dp-tun-packet-bot sb-dp-tun-packet-2" />
          <div className="sb-dp-tun-packet sb-dp-tun-packet-bot sb-dp-tun-packet-3" />
        </div>

        <div className="sb-dp-tun-clients">
          <div className="sb-dp-tun-tile sb-dp-tun-tile-chatgpt">
            <Image
              src="/assets/clients/chatgpt.webp"
              alt="ChatGPT"
              width={32}
              height={32}
            />
            <span className="sb-dp-tun-tile-name">ChatGPT</span>
            <span className="sb-dp-tun-tile-dot" aria-hidden />
          </div>
          <div className="sb-dp-tun-tile sb-dp-tun-tile-claude">
            <Image
              src="/assets/clients/claude.webp"
              alt="Claude"
              width={32}
              height={32}
            />
            <span className="sb-dp-tun-tile-name">Claude</span>
            <span className="sb-dp-tun-tile-dot" aria-hidden />
          </div>
        </div>
      </div>

      {/* Audit */}
      <div
        className={`sb-devpanel-card sb-dp-aud ${hover === "audit" ? "is-on" : ""}`}
      >
        {/* key forces remount so the CSS animation restarts on every hover */}
        <div key={auditKey} style={{ display: "contents" }}>
          <div className="sb-dp-aud-summary">
            <div className="sb-dp-aud-ring" aria-hidden>
              <svg viewBox="0 0 44 44" width="68" height="68">
                <defs>
                  <linearGradient id="sbAuditRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--sb-lime)" />
                    <stop offset="100%" stopColor="var(--sb-accent)" />
                  </linearGradient>
                </defs>
                <circle
                  cx="22"
                  cy="22"
                  r="19"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="3"
                />
                <circle
                  className="sb-dp-aud-ring-arc"
                  cx="22"
                  cy="22"
                  r="19"
                  fill="none"
                  stroke="url(#sbAuditRing)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform="rotate(-90 22 22)"
                />
              </svg>
              <div className="sb-dp-aud-ring-num">
                <span className="sb-dp-aud-ring-big">19</span>
                <span className="sb-dp-aud-ring-sm">/21</span>
              </div>
            </div>
            <div className="sb-dp-aud-summary-text">
              <div className="sb-dp-aud-title">2 issues to fix</div>
              <div className="sb-dp-aud-meta">
                <span className="sb-dp-aud-err">1 error</span>
                <span className="sb-dp-aud-meta-sep">·</span>
                <span className="sb-dp-aud-warn">1 warning</span>
                <span className="sb-dp-aud-meta-sep">·</span>
                <span className="sb-dp-aud-pass-meta">19 checks passed</span>
              </div>
            </div>
          </div>

          <AuditSection
            tone="warn"
            label="MCP tool checks"
            count={1}
            host="ChatGPT"
            row={{
              icon: "!",
              title: "2 tools missing invocation metadata",
              list: [
                { code: "play", text: "— missing invoking, invoked" },
                { code: "guess", text: "— missing invoking, invoked" },
              ],
            }}
          />

          <AuditSection
            tone="err"
            label="Failed"
            count={1}
            row={{
              icon: "×",
              title: "No authentication scheme configured",
              list: [
                { code: "authType", text: "— none detected" },
                { code: "required", text: "— OAuth 2.0 or API key scheme" },
              ],
            }}
          />

          <AuditSection
            tone="ok"
            label="Passed"
            count={19}
            row={{
              icon: "✓",
              title: "Server responded in 191ms",
              list: [
                { code: "Response time", text: "— 91ms" },
                { code: "Server", text: "— times-up 0.0.1" },
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}

type CodeValue = { key: string; title: string; description: string };

const VALUES: CodeValue[] = [
  {
    key: "hmr",
    title: "Hot module reload",
    description:
      "Edit a tool or widget and see the change in your MCP client instantly. Works with Claude, ChatGPT and the local emulator with no restarts and no redeploys needed.",
  },
  {
    key: "emulator",
    title: "Local emulator",
    description:
      "Run ChatGPT and Claude surfaces locally. Test the shapes, spacing, and dark/light of every host before you ship.",
  },
  {
    key: "tunnel",
    title: "Public tunnel",
    description:
      "One command exposes your dev server with a stable HTTPS URL. Test on Claude, ChatGPT and any MCP Client, from any device, including mobile.",
  },
  {
    key: "audit",
    title: "Server audit",
    description:
      "Test your MCP App against Claude and ChatGPT guidelines to see if it’s ready to submit, and hand findings straight to your coding agent to fix.",
  },
];

export function DevToolsSection() {
  const [hover, setHover] = useState<string | null>(null);
  const [auditKey, setAuditKey] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    const node = sectionRef.current;
    if (!node) {
      return;
    }
    let interval: ReturnType<typeof setInterval> | null = null;
    let index = 0;
    const cycle = () => {
      const value = VALUES[index % VALUES.length];
      setHover(value.key);
      if (value.key === "audit") {
        setAuditKey((k) => k + 1);
      }
      index += 1;
    };
    let io: IntersectionObserver | null = null;
    const setup = () => {
      if (!mq.matches || io) {
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && interval === null) {
              cycle();
              interval = setInterval(cycle, 2800);
            } else if (!entry.isIntersecting && interval !== null) {
              clearInterval(interval);
              interval = null;
            }
          }
        },
        { threshold: 0.2 },
      );
      io.observe(node);
    };
    const teardown = () => {
      io?.disconnect();
      io = null;
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setup();
      } else {
        teardown();
        setHover(null);
      }
    };
    mq.addEventListener("change", onChange);
    setup();
    return () => {
      mq.removeEventListener("change", onChange);
      teardown();
    };
  }, []);
  return (
    <section className="sb-section" id="integration" ref={sectionRef}>
      <div className="sb-wrap">
        <div className="sb-section-header" style={{ maxWidth: "700px" }}>
          <div className="sb-section-eyebrow">DevTools</div>
          <h2 className="sb-section-title">
            A local dev environment you will{" "}
            <span className="sb-accent">actually enjoy using</span>
          </h2>
          <p className="sb-section-lede">
            Skybridge comes with all batteries included. Dev server with HMR,
            local emulator, public tunnel, automatic app audit… we built great
            DX tools so you can focus on building a great MCP app.
          </p>
        </div>
        <div className="sb-devtools-grid" data-hover={hover || ""}>
          <div className="sb-devtools-shot">
            <DevPanel hover={hover} auditKey={auditKey} />
            <div className="sb-devtools-window sb-devtools-window-base">
              <div className="sb-devtools-chrome">
                <TerminalDots />
                <div className="sb-devtools-url">
                  <Icon name="globe" size={11} /> localhost:3000 ·{" "}
                  <span style={{ color: "var(--sb-accent)" }}>
                    Skybridge DevTools
                  </span>
                </div>
              </div>
              <div className="sb-devtools-body">
                <div className="sb-devtools-side">
                  <div className="sb-devtools-side-h">Tools</div>
                  {[
                    { label: "◆ search_flights", active: true },
                    { label: "◆ book_flight", active: false },
                    { label: "◆ cancel_booking", active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`sb-devtools-side-item${item.active ? " active" : ""}`}
                    >
                      {item.label}
                    </div>
                  ))}
                  <div className="sb-devtools-side-h" style={{ marginTop: 14 }}>
                    Hosts
                  </div>
                  {[
                    { label: "⌘ ChatGPT", active: false },
                    { label: "⌘ Claude", active: true },
                    { label: "⌘ Mobile tunnel", active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`sb-devtools-side-item${item.active ? " active" : ""}`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="sb-devtools-main">
                  <div className="sb-devtools-tabs">
                    <span className="sb-devtools-tab active">Preview</span>
                    <span className="sb-devtools-tab">Inputs</span>
                    <span className="sb-devtools-tab">Context</span>
                    <span className="sb-devtools-tab">History</span>
                    <span className="sb-devtools-hmr">● HMR · 12ms</span>
                  </div>
                  <div className="sb-devtools-preview">
                    <div className="sb-devtools-preview-card">
                      <div className="sb-devtools-preview-row">
                        <span>Paris → Tokyo</span>
                        <span
                          style={{ color: "var(--sb-accent)", fontWeight: 600 }}
                        >
                          $891
                        </span>
                      </div>
                      <div className="sb-devtools-preview-row sub">
                        <span>AF 276 · Nonstop · 11h 15m</span>
                        <span>10:25 → 06:40+1</span>
                      </div>
                      <div className="sb-devtools-preview-row sub">
                        <span>NH 216 · Nonstop · 11h 45m</span>
                        <span>13:10 → 08:55+1</span>
                      </div>
                      <div className="sb-devtools-preview-actions">
                        <span className="sb-devtools-chip primary">
                          Book AF 276
                        </span>
                        <span className="sb-devtools-chip">More options</span>
                      </div>
                    </div>
                    <div className="sb-devtools-console">
                      <div>
                        <span className="dim">→</span> search_flights{" "}
                        {'{ from:"CDG", to:"HND", date:"2026-04-28" }'}
                      </div>
                      <div>
                        <span className="ok">✓</span> 2 flights · 142ms
                      </div>
                      <div>
                        <span className="dim">◐</span> widget reloaded
                        (flights.tsx)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="sb-devtools-values">
            {VALUES.map((value) => (
              <div
                className={`sb-devtools-value ${hover === value.key ? "is-hover" : ""}`}
                key={value.title}
                onMouseEnter={() => {
                  setHover(value.key);
                  if (value.key === "audit") {
                    setAuditKey((k) => k + 1);
                  }
                }}
              >
                <div>
                  <h4 style={{ fontSize: 18 }}>{value.title}</h4>
                  <p style={{ fontSize: 16, color: "rgb(183, 197, 197)" }}>
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
