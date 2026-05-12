import type { ReactElement, ReactNode } from "react";

function VAFrame({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="sb-va-frame">
      <svg className="sb-va-grid" width="100%" height="100%" aria-hidden="true">
        <defs>
          <pattern
            id="sbGrid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sbGrid)" />
      </svg>
      <div className="sb-va-stage">{children}</div>
    </div>
  );
}

export function WriteOnceAnim() {
  return (
    <VAFrame>
      <svg
        viewBox="0 0 260 160"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        {[
          { x: 58, y: 84, label: "ANY HOST", delay: 0 },
          { x: 44, y: 62, label: "CLAUDE", delay: 0.7 },
          { x: 30, y: 40, label: "CHATGPT", delay: 1.4 },
        ].map((h, i) => (
          <g key={i} transform={`translate(${h.x},${h.y})`}>
            <rect
              width="170"
              height="70"
              rx="10"
              fill="rgba(18,18,18,0.92)"
              stroke="rgba(255,255,255,0.14)"
            />
            {/* titlebar dots */}
            <circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,0.22)" />
            <circle cx="21" cy="12" r="2.5" fill="rgba(255,255,255,0.22)" />
            <circle cx="30" cy="12" r="2.5" fill="rgba(255,255,255,0.22)" />
            <text
              x="160"
              y="16"
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize="8"
              fill="rgba(255,255,255,0.35)"
              letterSpacing="1"
            >
              {h.label}
            </text>
            {/* widget silhouette */}
            <rect
              x="12"
              y="26"
              width="72"
              height="8"
              rx="2"
              fill="rgba(255,255,255,0.16)"
            />
            <rect
              x="12"
              y="40"
              width="48"
              height="6"
              rx="2"
              fill="rgba(255,255,255,0.1)"
            />
            <rect
              x="12"
              y="50"
              width="92"
              height="6"
              rx="2"
              fill="rgba(255,255,255,0.1)"
            />
            <rect
              x="120"
              y="30"
              width="38"
              height="28"
              rx="6"
              fill="rgba(226,255,198,0.16)"
              stroke="rgba(226,255,198,0.55)"
            />
            {/* active ring */}
            <rect
              width="170"
              height="70"
              rx="10"
              fill="none"
              stroke="#E2FFC6"
              strokeWidth="1.2"
              opacity="0"
            >
              <animate
                attributeName="opacity"
                values="0;0.9;0"
                keyTimes="0;0.15;0.5"
                dur="2.4s"
                begin={`${h.delay}s`}
                repeatCount="indefinite"
              />
            </rect>
          </g>
        ))}
      </svg>
    </VAFrame>
  );
}

export function TypedAnim() {
  return (
    <VAFrame>
      <svg
        viewBox="0 0 260 160"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        <g fontFamily="var(--font-mono)" fontSize="9">
          {/* schema card */}
          <g transform="translate(16,24)">
            <rect
              width="108"
              height="112"
              rx="10"
              fill="rgba(18,18,18,0.92)"
              stroke="rgba(255,255,255,0.14)"
            />
            <text
              x="10"
              y="16"
              fill="rgba(255,255,255,0.4)"
              fontSize="8"
              letterSpacing="1"
            >
              SCHEMA.TS
            </text>
            <g transform="translate(10,34)" fill="#e8e8e8">
              <text y="0">
                <tspan fill="#ff7b9e">z</tspan>.object({"{"}
              </text>
              {[
                { y: 14, k: "from", t: "string" },
                { y: 28, k: "to", t: "string" },
                { y: 42, k: "date", t: "string" },
                { y: 56, k: "pax", t: "number" },
              ].map((r) => (
                <text key={r.k} y={r.y}>
                  {"  "}
                  {r.k}: <tspan fill="#7ab8ff">{r.t}</tspan>(),
                </text>
              ))}
              <text y="72">{"}"})</text>
            </g>
          </g>

          {/* arrow */}
          <g stroke="rgba(255,255,255,0.35)" fill="none">
            <path d="M 126 80 H 154" strokeWidth="1.2" />
            <path d="M 150 76 L 156 80 L 150 84" strokeWidth="1.2" />
          </g>
          <circle r="2.6" fill="#E2FFC6" opacity="0">
            <animate
              attributeName="cx"
              values="126;154"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="80;80"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;.15;.85;1"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </circle>

          {/* inferred component props */}
          <g transform="translate(158,24)">
            <rect
              width="88"
              height="112"
              rx="10"
              fill="rgba(226,255,198,0.05)"
              stroke="rgba(226,255,198,0.4)"
            />
            <text
              x="10"
              y="16"
              fill="rgba(255,255,255,0.4)"
              fontSize="8"
              letterSpacing="1"
            >
              FLIGHTS.TSX
            </text>
            <g transform="translate(10,34)">
              <text y="0" fill="#e8e8e8">
                <tspan fill="#ff7b9e">props</tspan>: {"{"}
              </text>
              {[
                { y: 14, k: "from", t: "string", d: 0.2 },
                { y: 28, k: "to", t: "string", d: 0.5 },
                { y: 42, k: "date", t: "string", d: 0.8 },
                { y: 56, k: "pax", t: "number", d: 1.1 },
              ].map((r) => (
                <g key={r.k}>
                  <rect
                    x="-3"
                    y={r.y - 10}
                    width="70"
                    height="13"
                    rx="3"
                    fill="#E2FFC6"
                    opacity="0"
                  >
                    <animate
                      attributeName="opacity"
                      values="0;0.26;0"
                      dur="2.4s"
                      begin={`${r.d}s`}
                      repeatCount="indefinite"
                    />
                  </rect>
                  <text y={r.y} fill="#e8e8e8">
                    {"  "}
                    {r.k}: <tspan fill="#7ab8ff">{r.t}</tspan>
                  </text>
                </g>
              ))}
              <text y="72" fill="#e8e8e8">
                {"}"}
              </text>
            </g>
          </g>
        </g>
      </svg>
    </VAFrame>
  );
}

export function DevEnvAnim() {
  return (
    <VAFrame>
      <svg
        viewBox="0 0 260 160"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* editor */}
        <g transform="translate(14,22)">
          <rect
            width="146"
            height="118"
            rx="10"
            fill="rgba(18,18,18,0.92)"
            stroke="rgba(255,255,255,0.14)"
          />
          <circle cx="12" cy="12" r="2.5" fill="#ff6159" />
          <circle cx="22" cy="12" r="2.5" fill="#ffbd2e" />
          <circle cx="32" cy="12" r="2.5" fill="#27c93f" />
          <text
            x="136"
            y="15"
            textAnchor="end"
            fontFamily="var(--font-mono)"
            fontSize="8"
            fill="rgba(255,255,255,0.35)"
            letterSpacing="1"
          >
            FLIGHTS.TSX
          </text>

          <g
            fontFamily="var(--font-mono)"
            fontSize="10"
            fill="#e8e8e8"
            transform="translate(14,36)"
          >
            <text y="0" fill="rgba(255,255,255,0.4)">
              export default
            </text>
            <text y="18">
              const <tspan fill="#ff7b9e">price</tspan> =
              <tspan fill="#8ed4a3">
                <animate
                  attributeName="opacity"
                  values="1;1;0;0;0;0"
                  keyTimes="0;.28;.32;.62;.66;1"
                  dur="3.2s"
                  repeatCount="indefinite"
                />
                {" 891"}
              </tspan>
              <tspan fill="#E2FFC6">
                <animate
                  attributeName="opacity"
                  values="0;0;1;1;0;0"
                  keyTimes="0;.28;.32;.62;.66;1"
                  dur="3.2s"
                  repeatCount="indefinite"
                />
                {" 749"}
              </tspan>
              <tspan fill="#8ed4a3">
                <animate
                  attributeName="opacity"
                  values="0;0;0;0;1;1"
                  keyTimes="0;.28;.32;.62;.66;1"
                  dur="3.2s"
                  repeatCount="indefinite"
                />
                {" 612"}
              </tspan>
              ;
            </text>
            <text y="36" fill="rgba(255,255,255,0.35)">
              &lt;<tspan fill="#7ab8ff">Flight</tspan> price={"{price}"} /&gt;
            </text>
            {/* caret */}
            <rect x="96" y="8" width="1.5" height="13" fill="#E2FFC6">
              <animate
                attributeName="opacity"
                values="1;0;1"
                dur="0.9s"
                repeatCount="indefinite"
              />
            </rect>
          </g>
        </g>

        {/* arrow */}
        <g stroke="rgba(255,255,255,0.3)" fill="none">
          <path d="M 164 82 H 184" strokeWidth="1.2" />
          <path d="M 180 78 L 186 82 L 180 86" strokeWidth="1.2" />
        </g>

        {/* host preview */}
        <g transform="translate(188,22)">
          <rect
            width="60"
            height="118"
            rx="10"
            fill="rgba(18,18,18,0.92)"
            stroke="rgba(255,255,255,0.14)"
          />
          <text
            x="30"
            y="14"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="7"
            fill="rgba(255,255,255,0.4)"
            letterSpacing="1"
          >
            CLAUDE
          </text>
          <rect
            x="8"
            y="22"
            width="44"
            height="30"
            rx="6"
            fill="rgba(226,255,198,0.12)"
            stroke="rgba(226,255,198,0.4)"
          />
          <text
            x="14"
            y="38"
            fontFamily="var(--font-display)"
            fontSize="12"
            fontWeight="600"
            fill="#f2f2f2"
          >
            <tspan>$</tspan>
            <tspan>
              <animate
                attributeName="opacity"
                values="1;1;0;0;0;0"
                keyTimes="0;.28;.32;.62;.66;1"
                dur="3.2s"
                repeatCount="indefinite"
              />
              891
            </tspan>
          </text>
          <text
            x="14"
            y="38"
            fontFamily="var(--font-display)"
            fontSize="12"
            fontWeight="600"
            fill="#f2f2f2"
          >
            <tspan>
              <animate
                attributeName="opacity"
                values="0;0;1;1;0;0"
                keyTimes="0;.28;.32;.62;.66;1"
                dur="3.2s"
                repeatCount="indefinite"
              />
              $749
            </tspan>
          </text>
          <text
            x="14"
            y="38"
            fontFamily="var(--font-display)"
            fontSize="12"
            fontWeight="600"
            fill="#f2f2f2"
          >
            <tspan>
              <animate
                attributeName="opacity"
                values="0;0;0;0;1;1"
                keyTimes="0;.28;.32;.62;.66;1"
                dur="3.2s"
                repeatCount="indefinite"
              />
              $612
            </tspan>
          </text>
          <rect
            x="8"
            y="60"
            width="44"
            height="5"
            rx="2"
            fill="rgba(255,255,255,0.1)"
          />
          <rect
            x="8"
            y="70"
            width="34"
            height="5"
            rx="2"
            fill="rgba(255,255,255,0.1)"
          />
          <rect
            x="8"
            y="80"
            width="40"
            height="5"
            rx="2"
            fill="rgba(255,255,255,0.1)"
          />
          {/* HMR badge */}
          <g transform="translate(8,96)">
            <circle cx="4" cy="4" r="3" fill="#27c93f">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </circle>
            <text
              x="12"
              y="7"
              fontFamily="var(--font-mono)"
              fontSize="7.5"
              fill="#27c93f"
              letterSpacing="0.6"
            >
              HMR · 12ms
            </text>
          </g>
        </g>
      </svg>
    </VAFrame>
  );
}
