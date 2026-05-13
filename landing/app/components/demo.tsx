"use client";

import { useState } from "react";
import { Icon } from "./icons";

type CodeTab = "server" | "view";

function FileIcon() {
  return (
    <svg
      className="sb-demo-code-icon"
      viewBox="0 0 16 16"
      width="13"
      height="13"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        d="M3.5 1.5h6L12.5 4.5v10h-9z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        d="M9.5 1.5v3h3"
      />
    </svg>
  );
}

function ServerCode() {
  return (
    <pre className="sb-demo-code-body">
      <div>
        <span className="c-kw">import</span> {"{ "}
        <span className="c-id">McpServer</span>
        {" }"} <span className="c-kw">from</span>{" "}
        <span className="c-str">"skybridge/server"</span>
        {";"}
      </div>
      <div>
        <span className="c-kw">import</span> {"{ "}
        <span className="c-id">z</span>
        {" }"} <span className="c-kw">from</span>{" "}
        <span className="c-str">"zod"</span>
        {";"}
      </div>
      <div>&nbsp;</div>
      <div>
        <span className="c-kw">const</span> <span className="c-id">server</span>{" "}
        = <span className="c-kw">new</span>{" "}
        <span className="c-fn">McpServer</span>({"{ "}
        <span className="c-id">name</span>:{" "}
        <span className="c-str">"travel"</span>
        {" }"});
      </div>
      <div>&nbsp;</div>
      <div>
        <span className="c-id">server</span>.
        <span className="c-fn">registerTool</span>(
      </div>
      <div>{"  {"}</div>
      <div>
        {"    "}
        <span className="c-id">name</span>:{" "}
        <span className="c-str">"findFlights"</span>,
      </div>
      <div>
        {"    "}
        <span className="c-id">description</span>:{" "}
        <span className="c-str">"Search flights"</span>,
      </div>
      <div>
        {"    "}
        <span className="c-id">inputSchema</span>: {"{ "}
        <span className="c-id">from</span>: z.
        <span className="c-fn">string</span>(), <span className="c-id">to</span>
        : z.
        <span className="c-fn">string</span>(),{" "}
        <span className="c-id">when</span>: z.
        <span className="c-fn">string</span>() {"}"},
      </div>
      <div>
        {"    "}
        <span className="c-id">view</span>: {"{ "}
        <span className="c-id">component</span>:{" "}
        <span className="c-str">"flights"</span> {"}"},
      </div>
      <div>{"  }"},</div>
      <div>
        {"  "}
        <span className="c-kw">async</span> ({"{ "}
        <span className="c-id">from</span>, <span className="c-id">to</span>,{" "}
        <span className="c-id">when</span>
        {" }"}) {"=>"} ({"{"}
      </div>
      <div>
        {"    "}
        <span className="c-id">structuredContent</span>: {"{"}
      </div>
      <div>
        {"      "}
        <span className="c-id">destination</span>:{" "}
        <span className="c-kw">await</span>{" "}
        <span className="c-fn">getCity</span>(<span className="c-id">to</span>),{" "}
        <span className="c-com">{"// { name, photo }"}</span>
      </div>
      <div>
        {"      "}
        <span className="c-id">flights</span>: (
        <span className="c-kw">await</span>{" "}
        <span className="c-fn">searchFlights</span>({"{ "}
        <span className="c-id">from</span>, <span className="c-id">to</span>,{" "}
        <span className="c-id">when</span>
        {" }"})).<span className="c-fn">map</span>((
        <span className="c-id">f</span>) {"=>"} ({"{"}
      </div>
      <div>
        {"        "}...<span className="c-id">f</span>,
      </div>
      <div>
        {"        "}
        <span className="c-id">airline</span>: {"{ "}
        <span className="c-id">name</span>: <span className="c-id">f</span>.
        <span className="c-id">carrier</span>,{" "}
        <span className="c-id">logo</span>:{" "}
        <span className="c-fn">logoFor</span>(<span className="c-id">f</span>.
        <span className="c-id">carrier</span>) {"}"},
      </div>
      <div>{"      "})),</div>
      <div>{"    }"},</div>
      <div>{"  }"}),</div>
      <div>);</div>
    </pre>
  );
}

function ViewCode() {
  return (
    <pre className="sb-demo-code-body">
      <div>
        <span className="c-kw">import</span> {"{ "}
        <span className="c-id">useToolInfo</span>
        {" }"} <span className="c-kw">from</span>{" "}
        <span className="c-str">"skybridge/vite"</span>
        {";"}
      </div>
      <div>&nbsp;</div>
      <div>
        <span className="c-kw">type</span> <span className="c-id">Output</span>{" "}
        = {"{"}
      </div>
      <div>
        {"  "}
        <span className="c-id">destination</span>: {"{ "}
        <span className="c-id">name</span>: <span className="c-id">string</span>
        {"; "}
        <span className="c-id">photo</span>:{" "}
        <span className="c-id">string</span> {"};"}
      </div>
      <div>
        {"  "}
        <span className="c-id">trip</span>: <span className="c-id">Trip</span>
        {";"}
      </div>
      <div>
        {"  "}
        <span className="c-id">flights</span>:{" "}
        <span className="c-id">Flight</span>[];
      </div>
      <div>{"}"};</div>
      <div>&nbsp;</div>
      <div>
        <span className="c-kw">export default function</span>{" "}
        <span className="c-fn">Flights</span>() {"{"}
      </div>
      <div>
        {"  "}
        <span className="c-kw">const</span> {"{ "}
        <span className="c-id">output</span>
        {" }"} = <span className="c-fn">useToolInfo</span>&lt;{"{ "}
        <span className="c-id">output</span>:{" "}
        <span className="c-id">Output</span> {"}"}&gt;();
      </div>
      <div>&nbsp;</div>
      <div>
        {"  "}
        <span className="c-kw">return</span> (
      </div>
      <div>
        {"    "}
        &lt;<span className="c-fn">Card</span>&gt;
      </div>
      <div>
        {"      "}
        &lt;<span className="c-fn">DestinationHero</span>{" "}
        <span className="c-id">destination</span>={"{"}
        <span className="c-id">output</span>.
        <span className="c-id">destination</span>
        {"}"} /&gt;
      </div>
      <div>
        {"      "}
        &lt;<span className="c-fn">TripSummary</span>{" "}
        <span className="c-id">trip</span>={"{"}
        <span className="c-id">output</span>.<span className="c-id">trip</span>
        {"}"} /&gt;
      </div>
      <div>
        {"      "}
        &lt;<span className="c-fn">FlightGrid</span>{" "}
        <span className="c-id">flights</span>={"{"}
        <span className="c-id">output</span>.
        <span className="c-id">flights</span>
        {"}"} /&gt;
      </div>
      <div>
        {"      "}
        &lt;<span className="c-fn">Actions</span>{" "}
        <span className="c-id">cheapest</span>={"{"}
        <span className="c-id">output</span>.
        <span className="c-id">flights</span>[0]
        {"}"} /&gt;
      </div>
      <div>
        {"    "}
        &lt;/<span className="c-fn">Card</span>&gt;
      </div>
      <div>{"  "});</div>
      <div>{"}"}</div>
    </pre>
  );
}

function AirlineMark({
  code,
  background,
  foreground,
}: {
  code: string;
  background: string;
  foreground: string;
}) {
  return (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        color: foreground,
        font: "700 10.5px/1 var(--font-display)",
        letterSpacing: "0.5px",
        flexShrink: 0,
      }}
    >
      {code}
    </span>
  );
}

function FlightWidget() {
  return (
    <div className="sb-widget">
      <div className="sb-widget-head">
        <span className="sb-widget-dot" />
        Skybridge · flights.tsx
      </div>
      {/* Destination hero — Tokyo night photo */}
      <div
        style={{
          position: "relative",
          height: 96,
          borderBottom: "1px solid var(--sb-border)",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          padding: "10px 14px",
          backgroundImage: "url(/assets/tokyo.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 60%",
        }}
      >
        {/* subtle dark gradient so text stays legible */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
          }}
        />
        <span
          style={{
            position: "relative",
            zIndex: 1,
            font: "500 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          東京 · Tokyo
        </span>
      </div>
      <div className="sb-widget-body">
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                font: "500 11.5px/1 var(--font-body)",
                color: "var(--sb-ink-mute)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Round trip · Apr 28 → May 5
            </div>
            <div
              style={{ font: "600 22px/1.2 var(--font-display)", marginTop: 6 }}
            >
              Paris <span style={{ color: "var(--sb-ink-mute)" }}>→</span> Tokyo
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                font: "700 26px/1 var(--font-display)",
                letterSpacing: "-0.8px",
                color: "var(--sb-accent)",
              }}
            >
              $891
            </div>
            <div
              style={{
                font: "500 11px/1 var(--font-body)",
                color: "var(--sb-ink-mute)",
                marginTop: 4,
              }}
            >
              per traveller
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            paddingTop: 14,
            borderTop: "1px solid var(--sb-border)",
          }}
        >
          {[
            {
              airline: "Air France",
              flightNumber: "AF 276",
              time: "10:25 → 06:40+1",
              stops: "Nonstop · 11h 15m",
              code: "AF",
              background: "#002157",
              foreground: "#ffffff",
            },
            {
              airline: "ANA",
              flightNumber: "NH 216",
              time: "13:10 → 08:55+1",
              stops: "Nonstop · 11h 45m",
              code: "NH",
              background: "#0d2d6c",
              foreground: "#ffffff",
            },
          ].map((flight) => (
            <div
              key={flight.flightNumber}
              style={{
                padding: 12,
                border: "1px solid var(--sb-border)",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AirlineMark
                  code={flight.code}
                  background={flight.background}
                  foreground={flight.foreground}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: "600 13px/1.3 var(--font-body)" }}>
                    {flight.airline}
                  </div>
                  <div
                    style={{
                      font: "500 11.5px/1 var(--font-body)",
                      color: "var(--sb-ink-mute)",
                      marginTop: 2,
                    }}
                  >
                    {flight.flightNumber}
                  </div>
                </div>
              </div>
              <div
                style={{
                  font: "500 13px/1.2 var(--font-mono)",
                  marginTop: 10,
                  color: "var(--sb-ink)",
                }}
              >
                {flight.time}
              </div>
              <div
                style={{
                  font: "400 11px/1 var(--font-body)",
                  color: "var(--sb-ink-mute)",
                  marginTop: 4,
                }}
              >
                {flight.stops}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            className="sb-btn sb-btn-primary"
            style={{ flex: 1, justifyContent: "center", height: 38 }}
          >
            Book AF 276
          </button>
          <button className="sb-btn sb-btn-ghost" style={{ height: 38 }}>
            More flights
          </button>
        </div>
      </div>
    </div>
  );
}

export function CodeDemoSection() {
  const [tab, setTab] = useState<CodeTab>("server");
  return (
    <section className="sb-section" id="demo">
      <div className="sb-wrap">
        <div className="sb-section-header">
          <div className="sb-section-eyebrow">Get started fast</div>
          <h2 className="sb-section-title">
            Create your <span className="sb-accent">MCP app</span>
            <br />
            in seconds
          </h2>
          <p className="sb-section-sub" style={{ padding: "30px 0px" }}>
            Skybridge is the full-stack TypeScript framework for building MCP
            Apps: define tools, write React components, ship.
          </p>
        </div>

        <div className="sb-demo">
          <div className="sb-demo-split">
            <div className="sb-demo-code-pane">
              <div className="sb-demo-code-head">
                <button
                  type="button"
                  className={`sb-demo-code-tab${tab === "server" ? " is-active" : ""}`}
                  onClick={() => setTab("server")}
                >
                  <FileIcon />
                  <span className="sb-demo-code-file">src/server.ts</span>
                </button>
                <button
                  type="button"
                  className={`sb-demo-code-tab${tab === "view" ? " is-active" : ""}`}
                  onClick={() => setTab("view")}
                >
                  <FileIcon />
                  <span className="sb-demo-code-file">
                    src/views/flights.tsx
                  </span>
                </button>
              </div>
              {tab === "server" ? <ServerCode /> : <ViewCode />}
            </div>

            <div className="sb-chat-window">
              {/* ChatGPT-style sidebar */}
              <div className="sb-gpt-sidebar" aria-hidden>
                <div className="sb-gpt-logo">
                  <svg viewBox="0 0 22 22" width="20" height="20" fill="none" aria-hidden>
                    <circle cx="11" cy="11" r="10" fill="#fff" opacity="0.9" />
                    <circle cx="11" cy="11" r="4.2" fill="#111" />
                    <circle cx="11" cy="11" r="1.8" fill="#fff" />
                  </svg>
                </div>
                <div className="sb-gpt-sidebar-icons">
                  <span className="sb-gpt-icon-btn">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <line x1="8" y1="3" x2="8" y2="13" />
                      <line x1="3" y1="8" x2="13" y2="8" />
                    </svg>
                  </span>
                  <span className="sb-gpt-icon-btn">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <circle cx="6.5" cy="6.5" r="4.5" />
                      <line x1="10" y1="10" x2="14" y2="14" />
                    </svg>
                  </span>
                </div>
                <div className="sb-gpt-sidebar-hist">
                  <span className="sb-gpt-hist-line" />
                  <span className="sb-gpt-hist-line" />
                  <span className="sb-gpt-hist-line sb-gpt-hist-active" />
                  <span className="sb-gpt-hist-line" />
                </div>
              </div>

              {/* Main chat area */}
              <div className="sb-gpt-main">
                {/* Top bar */}
                <div className="sb-gpt-topbar">
                  <button className="sb-gpt-model-btn" type="button">
                    ChatGPT 5
                    <svg viewBox="0 0 10 6" width="9" height="6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="1,1 5,5 9,1" />
                    </svg>
                  </button>
                  <div className="sb-gpt-topbar-right" aria-hidden>
                    <span className="sb-gpt-share-btn">Share</span>
                    <span className="sb-gpt-user-avatar">E</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="sb-chat">
                  {/* User message */}
                  <div className="sb-chat-msg user">
                    <div className="sb-chat-bubble user">
                      Find me flights from Paris to Tokyo next week
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="sb-chat-msg">
                    <div className="sb-chat-widget-wrap">
                      <div className="sb-chat-bubble ai" style={{ marginBottom: 10 }}>
                        Here are two nonstop options — Air France is the cheapest:
                      </div>
                      <FlightWidget />
                      <div className="sb-chat-bubble ai" style={{ marginTop: 10 }}>
                        Want me to hold the AF 276 seat, or compare with a one-stop under $700?
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="sb-gpt-inputbar" aria-hidden>
                  <span className="sb-gpt-input-placeholder">Ask anything</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
