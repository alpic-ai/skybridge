"use client";

import { useState } from "react";
import { CopyOption } from "./copy-option";
import { Icon, type IconName } from "./icons";

type ValueItem = {
  icon: IconName;
  t: string;
  d: string[];
  cta?: { label: string; href: string };
};

export function SBValues() {
  const values: ValueItem[] = [
    {
      icon: "globe",
      t: "Write once, run everywhere",
      d: [
        "Skybridge abstracts implementation differences, so your app runs seamlessly in Claude, ChatGPT, VSCode and any client compatible with MCP apps.",
        "Your app runs seamlessly in Claude, ChatGPT, Cursor and any other MCP-Apps compatible client, with Skybridge abstracting all the implementation differences.",
      ],
    },
    {
      icon: "terminal",
      t: "Delightful dev environment",
      d: [
        "Get a complete local emulator, Hot Module Reload and instant tunnel to connect your local app to Claude & ChatGPT.",
        "Local DevTools playground, hot reload, tunnels to real hosts. Iterate at the speed of thought.",
      ],
    },
    {
      icon: "wand",
      t: "Agent-ready",
      d: [
        "Powerful Skills, CLI and programmatic devtools APIs: everything your coding agent needs to build MCP apps end-to-end.",
        "Built to be used by agents, not just humans. First-class Skills, a powerful CLI, and programmatic DevTools APIs to give your coding agent full autonomy.",
      ],
    },
    {
      icon: "type",
      t: "Type-safe end-to-end",
      d: [
        "tRPC-style inference from MCP server tool definition to React view.",
        "Zod schemas on tools, full TS inference into your widget props. No stringly-typed APIs.",
      ],
    },
    {
      icon: "react",
      t: "React friendly",
      d: [
        "Intuitive react-query style hooks, with advanced state management. If you know React, you’ve got Skybridge.",
      ],
    },
    {
      icon: "book",
      t: "Examples library",
      d: [
        "Get started quickly with production-ready app examples for e-commerce, travel, SaaS, and others.",
      ],
      cta: { label: "See examples", href: "#showcase" },
    },
  ];

  return (
    <section className="sb-section" id="values">
      <div className="sb-wrap">
        <div className="sb-section-header">
          <div className="sb-section-eyebrow">Opinionated where it matters</div>

          <h2 className="sb-section-title">
            The MCP framework for developers with{" "}
            <span className="sb-accent">taste</span>.
          </h2>
        </div>
        <div className="sb-values">
          {values.map((v) => {
            const descList = v.d;
            return (
              <div className="sb-value" key={v.t}>
                <div className="sb-value-body">
                  <span className="sb-value-icon">
                    <Icon name={v.icon} size={28} stroke={2.2} />
                  </span>
                  <h3>{v.t}</h3>
                  <CopyOption as="p" options={descList} />
                  {v.cta && (
                    <a className="sb-value-cta" href={v.cta.href}>
                      {v.cta.label}
                      <Icon name="arrow" size={13} stroke={2} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SBDevPanel({ hover }: { hover: string | null }) {
  return (
    <div className="sb-devpanel" aria-hidden="true">
      {/* HMR */}
      <div
        className={`sb-devpanel-card sb-dp-hmr ${hover === "hmr" ? "is-on" : ""}`}
      >
        <div className="sb-dp-toast">
          <span className="sb-dp-toast-dot" />
          <div>
            <div className="sb-dp-toast-t">HMR · 12ms</div>
            <div className="sb-dp-toast-s">flights.tsx · widget reloaded</div>
          </div>
        </div>
        <div className="sb-dp-code">
          <div>
            <span className="sb-c-com">// edit & save</span>
          </div>
          <div>
            <span className="sb-c-kw">const</span>{" "}
            <span className="sb-c-var">price</span> ={" "}
            <span className="sb-c-str">"$891"</span>
            <span className="sb-dp-caret">|</span>
          </div>
        </div>
        <div className="sb-dp-widget">
          <div className="sb-dp-widget-row">
            <span>Paris → Tokyo</span>
            <strong>$891</strong>
          </div>
          <div className="sb-dp-widget-row sub">
            <span>AF 276 · Nonstop</span>
            <span>11h 15m</span>
          </div>
        </div>
      </div>

      {/* Emulator */}
      <div
        className={`sb-devpanel-card sb-dp-emu ${hover === "emulator" ? "is-on" : ""}`}
      >
        <div className="sb-dp-emu-row">
          <div className="sb-dp-surface">
            <div className="sb-dp-surface-h">ChatGPT</div>
            <div className="sb-dp-surface-body">
              <div className="sb-dp-msg">search_flights Paris → Tokyo</div>
              <div className="sb-dp-card">
                <div className="sb-dp-card-r">
                  <span>AF 276</span>
                  <strong>$891</strong>
                </div>
                <div className="sb-dp-card-r sub">
                  <span>Nonstop</span>
                  <span>11h 15m</span>
                </div>
              </div>
            </div>
          </div>
          <div className="sb-dp-surface dark">
            <div className="sb-dp-surface-h">Claude</div>
            <div className="sb-dp-surface-body">
              <div className="sb-dp-msg">search_flights Paris → Tokyo</div>
              <div className="sb-dp-card">
                <div className="sb-dp-card-r">
                  <span>AF 276</span>
                  <strong>$891</strong>
                </div>
                <div className="sb-dp-card-r sub">
                  <span>Nonstop</span>
                  <span>11h 15m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="sb-dp-emu-foot">Same source · two hosts · live</div>
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
          <div className="sb-dp-url">https://bold-mesa-2a.skybridge.app</div>
          <div>
            <span className="sb-c-com">→ Ready on Claude, ChatGPT, mobile</span>
          </div>
        </div>
        <div className="sb-dp-devices">
          <div className="sb-dp-phone">
            <div className="sb-dp-phone-top" />
            <div className="sb-dp-phone-card">
              <div className="sb-dp-card-r">
                <span>AF 276</span>
                <strong>$891</strong>
              </div>
            </div>
          </div>
          <div className="sb-dp-laptop">
            <div className="sb-dp-laptop-scr">
              <div className="sb-dp-card-r">
                <span>AF 276</span>
                <strong>$891</strong>
              </div>
              <div className="sb-dp-card-r sub">
                <span>Nonstop</span>
                <span>11h 15m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit */}
      <div
        className={`sb-devpanel-card sb-dp-aud ${hover === "audit" ? "is-on" : ""}`}
      >
        <div className="sb-dp-aud-summary">
          <div className="sb-dp-aud-ring" aria-hidden>
            <svg viewBox="0 0 44 44" width="68" height="68">
              <defs>
                <linearGradient id="sbAuditRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f22b79" />
                  <stop offset="100%" stopColor="#89F0EC" />
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
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke="url(#sbAuditRing)"
                strokeWidth="3"
                strokeDasharray={`${(19 / 21) * 2 * Math.PI * 19} ${2 * Math.PI * 19}`}
                strokeDashoffset={`${0.25 * 2 * Math.PI * 19}`}
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

        <div className="sb-dp-aud-section">
          <div className="sb-dp-aud-section-h">
            <span className="sb-dp-aud-section-label">MCP tool checks</span>
            <span className="sb-dp-aud-dot warn" aria-hidden></span>
            <span className="sb-dp-aud-count">1</span>
            <span className="sb-dp-aud-host">ChatGPT</span>
          </div>
          <div className="sb-dp-aud-row warn">
            <span className="sb-dp-aud-icon" aria-hidden>
              !
            </span>
            <div className="sb-dp-aud-row-body">
              <div className="sb-dp-aud-row-title">
                2 tools missing invocation metadata
              </div>
              <div className="sb-dp-aud-row-bar">
                <div className="sb-dp-aud-row-list">
                  <div>
                    <code>play</code> <span>— missing invoking, invoked</span>
                  </div>
                  <div>
                    <code>guess</code> <span>— missing invoking, invoked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sb-dp-aud-section">
          <div className="sb-dp-aud-section-h">
            <span className="sb-dp-aud-section-label">Failed</span>
            <span className="sb-dp-aud-dot err" aria-hidden></span>
            <span className="sb-dp-aud-count">1</span>
          </div>
          <div className="sb-dp-aud-row err">
            <span className="sb-dp-aud-icon" aria-hidden>
              ×
            </span>
            <div className="sb-dp-aud-row-body">
              <div className="sb-dp-aud-row-title">
                No authentication scheme configured
              </div>
              <div className="sb-dp-aud-row-bar">
                <div className="sb-dp-aud-row-list">
                  <div>
                    <code>authType</code> <span>— none detected</span>
                  </div>
                  <div>
                    <code>required</code>{" "}
                    <span>— OAuth 2.0 or API key scheme</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sb-dp-aud-section">
          <div className="sb-dp-aud-section-h">
            <span className="sb-dp-aud-section-label">Passed</span>
            <span className="sb-dp-aud-dot ok" aria-hidden></span>
            <span className="sb-dp-aud-count">19</span>
          </div>
          <div className="sb-dp-aud-row ok">
            <span className="sb-dp-aud-icon" aria-hidden>
              ✓
            </span>
            <div className="sb-dp-aud-row-body">
              <div className="sb-dp-aud-row-title">
                Server responded in 191ms
              </div>
              <div className="sb-dp-aud-row-bar">
                <div className="sb-dp-aud-row-list">
                  <div>
                    <code>Response time</code> <span>— 91ms</span>
                  </div>
                  <div>
                    <code>Server</code> <span>— times-up 0.0.1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type CodeValue = { key: string; t: string; d: string };

export function SBCode() {
  const values: CodeValue[] = [
    {
      key: "hmr",
      t: "Hot module reload",
      d: "Edit a tool or widget and see the change in your MCP Client instantly. Works with Claude, ChatGPT and the local emulator — no restarts, no redeploys.",
    },
    {
      key: "emulator",
      t: "Local emulator",
      d: "Run ChatGPT and Claude surfaces locally. Test the shapes, spacing, and dark/light of every host before you ship.",
    },
    {
      key: "tunnel",
      t: "Public tunnel",
      d: "One command exposes your dev server with a stable HTTPS URL — test on Claude, ChatGPT and any MCP Client, from any device including mobile.",
    },
    {
      key: "audit",
      t: "Audit your server",
      d: "Test your MCP App against Claude and ChatGPT guidelines to see if it’s ready to submit, and hand findings straight to your coding agent to fix.",
    },
  ];

  const [hover, setHover] = useState<string | null>(null);
  return (
    <section className="sb-section" id="integration">
      <div className="sb-wrap">
        <div className="sb-section-header" style={{ width: "700px" }}>
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
            <SBDevPanel hover={hover} />
            <div className="sb-devtools-window sb-devtools-window-base">
              <div className="sb-devtools-chrome">
                <span
                  className="sb-devtools-dot"
                  style={{ background: "#ff6159" }}
                />
                <span
                  className="sb-devtools-dot"
                  style={{ background: "#ffbd2e" }}
                />
                <span
                  className="sb-devtools-dot"
                  style={{ background: "#27c93f" }}
                />
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
                  <div className="sb-devtools-side-item active">
                    ◆ search_flights
                  </div>
                  <div className="sb-devtools-side-item">◆ book_flight</div>
                  <div className="sb-devtools-side-item">◆ cancel_booking</div>
                  <div className="sb-devtools-side-h" style={{ marginTop: 14 }}>
                    Hosts
                  </div>
                  <div className="sb-devtools-side-item">⌘ ChatGPT</div>
                  <div className="sb-devtools-side-item active">⌘ Claude</div>
                  <div className="sb-devtools-side-item">⌘ Mobile tunnel</div>
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
            {values.map((v) => (
              <div
                className={`sb-devtools-value ${hover === v.key ? "is-hover" : ""}`}
                key={v.t}
                onMouseEnter={() => setHover(v.key)}
                onMouseLeave={() =>
                  setHover((cur) => (cur === v.key ? null : cur))
                }
              >
                <div>
                  <h4 style={{ fontSize: 18 }}>{v.t}</h4>
                  <p style={{ fontSize: 16, color: "rgb(183, 197, 197)" }}>
                    {v.d}
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
