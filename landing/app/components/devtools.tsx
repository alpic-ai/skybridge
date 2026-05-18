"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { ClaudeStarSVG } from "./showcase/chatgpt-frame";

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
              <span className="sb-c-kw">const</span>{" "}
              <span className="sb-c-punc">{"{"}</span>{" "}
              <span className="sb-c-var">output</span>{" "}
              <span className="sb-c-punc">{"}"}</span>{" "}
              <span className="sb-c-punc">=</span>{" "}
              <span className="sb-c-fn">useToolInfo</span>
              <span className="sb-c-punc">&lt;</span>
              <span className="sb-c-str">"searchFlights"</span>
              <span className="sb-c-punc">&gt;()</span>
            </div>
            <div className="sb-dp-diff-line sb-dp-diff-del">
              <span className="sb-dp-diff-sign">−</span>
              <span className="sb-c-tag">&lt;FlightCard</span>{" "}
              <span className="sb-c-var">flight</span>
              <span className="sb-c-punc">
                ={"{"}output{"}"}
              </span>{" "}
              <span className="sb-c-tag">/&gt;</span>
            </div>
            <div className="sb-dp-diff-line sb-dp-diff-add">
              <span className="sb-dp-diff-sign">+</span>
              <span className="sb-c-tag">&lt;FlightCard</span>{" "}
              <span className="sb-c-var">flight</span>
              <span className="sb-c-punc">
                ={"{"}output{"}"}
              </span>{" "}
              <span className="sb-c-var">highlight</span>{" "}
              <span className="sb-c-tag">/&gt;</span>
            </div>
            <div className="sb-dp-diff-line sb-dp-diff-ctx">
              <span className="sb-dp-diff-sign"> </span>
              <span className="sb-c-tag">&lt;BookButton</span>{" "}
              <span className="sb-c-var">flight</span>
              <span className="sb-c-punc">
                ={"{"}output{"}"}
              </span>{" "}
              <span className="sb-c-tag">/&gt;</span>
            </div>
          </div>
        </div>
        <div className="sb-dp-diff-arrow">↓</div>
        <div className="sb-dp-widget">
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
        <div className="sb-dp-term">
          <div className="sb-dp-term-h">$ skybridge tunnel</div>
          <div>
            <span className="sb-c-com">→ Stable URL provisioned</span>
          </div>
          <div className="sb-dp-url">
            https://cool-marmot-fondue-420.alpic.dev/mcp
          </div>
          <div>
            <span className="sb-c-com">→ Ready on Claude, ChatGPT, mobile</span>
          </div>
        </div>
        <div className="sb-dp-tun-diagram">
          <div className="sb-dp-tun-btn">
            <span className="sb-dp-tun-btn-dot" />
            Tunnel
          </div>
          <svg
            className="sb-dp-tun-arrows"
            width="180"
            height="36"
            viewBox="0 0 180 36"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="arr-l"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(137,240,236,0.4)" />
              </marker>
              <marker
                id="arr-r"
                markerWidth="6"
                markerHeight="6"
                refX="3"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(137,240,236,0.4)" />
              </marker>
            </defs>
            <line
              x1="90"
              y1="2"
              x2="22"
              y2="30"
              stroke="rgba(137,240,236,0.35)"
              strokeWidth="1"
              strokeDasharray="3 2"
              markerEnd="url(#arr-l)"
            />
            <line
              x1="90"
              y1="2"
              x2="158"
              y2="30"
              stroke="rgba(137,240,236,0.35)"
              strokeWidth="1"
              strokeDasharray="3 2"
              markerEnd="url(#arr-r)"
            />
          </svg>
          <div className="sb-dp-tun-clients">
            <div className="sb-dp-tun-client sb-dp-tun-client--chatgpt">
              <div className="sb-dp-tun-client-chrome">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071.005L2.34 13.01A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.124 7.2a.076.076 0 0 1 .071-.005l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.664zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.681 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.361l2.602-1.502 2.603 1.502v3.003l-2.603 1.502-2.602-1.502z" />
                </svg>
                <span>ChatGPT</span>
              </div>
              <div className="sb-dp-tun-client-body">
                <span className="sb-dp-tun-used">Used app</span>
              </div>
            </div>
            <div className="sb-dp-tun-client sb-dp-tun-client--claude">
              <div className="sb-dp-tun-client-chrome">
                <ClaudeStarSVG size={10} />
                <span>Claude</span>
              </div>
              <div className="sb-dp-tun-client-body">
                <span className="sb-dp-tun-used">Used app</span>
              </div>
            </div>
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
  return (
    <section className="sb-section" id="integration">
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
