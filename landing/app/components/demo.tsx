import { Icon } from "./icons";

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
      {/* Destination hero — striped placeholder per design-system rules. */}
      <div
        style={{
          position: "relative",
          height: 96,
          margin: "0 0 0 0",
          borderBottom: "1px solid var(--sb-border)",
          background:
            "linear-gradient(135deg, rgba(137,240,236,0.22), rgba(226,255,198,0.16) 60%, rgba(242,43,121,0.20))," +
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 8px, transparent 8px 16px)",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          padding: "12px 14px",
        }}
      >
        <span
          style={{
            font: "500 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "var(--sb-ink-soft)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          [ destination · tokyo / 東京 ]
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
                <span className="sb-demo-code-tab">
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
                  <span className="sb-demo-code-file">server/flights.ts</span>
                </span>
              </div>
              <pre className="sb-demo-code-body">
                <div>
                  <span className="c-kw">import</span> {"{ "}
                  <span className="c-id">McpServer</span>
                  {" }"} <span className="c-kw">from</span>{" "}
                  <span className="c-str">"skybridge/server"</span>;
                </div>
                <div>
                  <span className="c-kw">import</span> {"{ "}
                  <span className="c-id">z</span>
                  {" }"} <span className="c-kw">from</span>{" "}
                  <span className="c-str">"zod"</span>;
                </div>
                <div>
                  <span className="c-kw">import</span>{" "}
                  <span className="c-id">Flights</span>{" "}
                  <span className="c-kw">from</span>{" "}
                  <span className="c-str">"./widgets/flights"</span>;
                </div>
                <div>&nbsp;</div>
                <div>
                  <span className="c-kw">const</span>{" "}
                  <span className="c-id">server</span> ={" "}
                  <span className="c-kw">new</span>{" "}
                  <span className="c-fn">McpServer</span>({"{ "}
                  <span className="c-id">name</span>:{" "}
                  <span className="c-str">"travel"</span>
                  {" }"});
                </div>
                <div>&nbsp;</div>
                <div>
                  <span className="c-id">server</span>.
                  <span className="c-fn">registerWidget</span>(
                </div>
                <div>
                  {"  "}
                  <span className="c-str">"findFlights"</span>,
                </div>
                <div>{"  {"}</div>
                <div>
                  {"    "}
                  <span className="c-id">description</span>:{" "}
                  <span className="c-str">"Search flights"</span>,
                </div>
                <div>
                  {"    "}
                  <span className="c-id">inputSchema</span>: {"{ "}
                  <span className="c-id">from</span>: z.
                  <span className="c-fn">string</span>(),{" "}
                  <span className="c-id">to</span>: z.
                  <span className="c-fn">string</span>(),{" "}
                  <span className="c-id">when</span>: z.
                  <span className="c-fn">string</span>() {"}"},
                </div>
                <div>
                  {"    "}
                  <span className="c-id">component</span>:{" "}
                  <span className="c-id">Flights</span>,
                </div>
                <div>{"  }"},</div>
                <div>
                  {"  "}
                  <span className="c-kw">async</span> ({"{ "}
                  <span className="c-id">from</span>,{" "}
                  <span className="c-id">to</span>,{" "}
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
                  <span className="c-fn">getCity</span>(
                  <span className="c-id">to</span>),{" "}
                  <span className="c-com">{"// { name, photo }"}</span>
                </div>
                <div>
                  {"      "}
                  <span className="c-id">flights</span>: (
                  <span className="c-kw">await</span>{" "}
                  <span className="c-fn">searchFlights</span>({"{ "}
                  <span className="c-id">from</span>,{" "}
                  <span className="c-id">to</span>,{" "}
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
                  <span className="c-id">name</span>:{" "}
                  <span className="c-id">f</span>.
                  <span className="c-id">carrier</span>,{" "}
                  <span className="c-id">logo</span>:{" "}
                  <span className="c-fn">logoFor</span>(
                  <span className="c-id">f</span>.
                  <span className="c-id">carrier</span>) {"}"},
                </div>
                <div>{"      "})),</div>
                <div>{"    }"},</div>
                <div>{"  }"}),</div>
                <div>);</div>
              </pre>
            </div>

            <div className="sb-chat-window">
              <div className="sb-chat-chrome">
                <div className="sb-chat-chrome-dots">
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
                </div>
                <div className="sb-chat-chrome-tab">
                  <span className="sb-chat-chrome-lock" aria-hidden></span>
                  <span>claude.ai/chat</span>
                </div>
                <div className="sb-chat-chrome-actions" aria-hidden>
                  <span className="sb-chat-chrome-bar" />
                  <span className="sb-chat-chrome-bar" />
                  <span className="sb-chat-chrome-bar" />
                </div>
              </div>
              <div className="sb-chat">
                {/* user message */}
                <div className="sb-chat-msg user">
                  <div className="sb-chat-bubble user">
                    Find me flights from Paris to Tokyo next week
                  </div>
                  <div className="sb-chat-avatar">JD</div>
                </div>

                {/* AI response */}
                <div className="sb-chat-msg">
                  <div className="sb-chat-avatar ai">
                    <Icon name="sparkle" size={13} />
                  </div>
                  <div className="sb-chat-widget-wrap">
                    <div
                      className="sb-chat-bubble ai"
                      style={{ marginBottom: 10 }}
                    >
                      Here are two nonstop options — Air France is the cheapest:
                    </div>
                    <FlightWidget />
                    <div
                      className="sb-chat-bubble ai"
                      style={{ marginTop: 10 }}
                    >
                      Want me to hold the AF 276 seat, or compare with a
                      one-stop under $700?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
