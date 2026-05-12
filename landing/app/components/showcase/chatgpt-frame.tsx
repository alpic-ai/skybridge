import Image from "next/image";
import type { ReactElement } from "react";
import { hostAccent, type ShowcaseApp } from "./data";

export { hostAccent };

export const ClaudeStarSVG = ({
  size = 14,
}: {
  size?: number;
}): ReactElement => {
  const rays: ReactElement[] = [];
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const inner = 2.6;
    const outer = 11.2;
    const cx = 12,
      cy = 12;
    const x1 = cx + Math.cos(a) * inner;
    const y1 = cy + Math.sin(a) * inner;
    const x2 = cx + Math.cos(a) * outer;
    const y2 = cy + Math.sin(a) * outer;
    rays.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />);
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {rays}
    </svg>
  );
};

type ChatGPTFrameProps = {
  app: ShowcaseApp;
  compact?: boolean;
  imageOverride?: string;
};

export function ChatGPTFrame({
  app,
  compact = false,
  imageOverride,
}: ChatGPTFrameProps) {
  const accent = hostAccent(app.host);
  const hostLower = (app.host || "").toLowerCase();
  const isClaude =
    hostLower.includes("claude") && !hostLower.includes("chatgpt");
  const modelLabel = isClaude ? "Claude Sonnet 4.5" : "ChatGPT 5";
  return (
    <div className={`cg-frame ${compact ? "is-compact" : ""}`}>
      {/* Sidebar */}
      <div className="cg-sidebar">
        <div className="cg-side-top">
          <div className="cg-logo">
            {isClaude ? (
              <ClaudeStarSVG size={14} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="currentColor"
              >
                <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" />
              </svg>
            )}
          </div>
          <div className="cg-side-icons">
            <div className="cg-side-ic">
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </div>
            <div className="cg-side-ic">
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M11 11l3 3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
        <div className="cg-side-section">
          <div className="cg-side-label">Chats</div>
          <div className="cg-side-item is-active">{app.name}</div>
          <div className="cg-side-item">Trip planning</div>
          <div className="cg-side-item">Recipe ideas</div>
          <div className="cg-side-item">Refactor notes</div>
        </div>
      </div>

      {/* Main */}
      <div className="cg-main">
        <div className="cg-topbar">
          <div className="cg-model">
            <span>{modelLabel}</span>
            <svg
              viewBox="0 0 12 12"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M3 4.5l3 3 3-3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="cg-top-actions">
            <div className="cg-pill">Share</div>
            <div className="cg-avatar" style={{ background: accent }}>
              E
            </div>
          </div>
        </div>

        <div className="cg-thread">
          <div className="cg-user-row">
            <div className="cg-user-bubble">{app.chat.user}</div>
          </div>

          <div className="cg-asst-row">
            <div className="cg-asst-icon">
              {isClaude ? (
                <ClaudeStarSVG size={14} />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" />
                </svg>
              )}
            </div>
            <div className="cg-asst-body">
              <div className="cg-toolcall">
                <span
                  className="cg-tool-dot"
                  style={{ background: accent }}
                ></span>
                <span className="cg-tool-app">{app.name}</span>
                <span className="cg-tool-sep">·</span>
                <span className="cg-tool-action">Used app</span>
              </div>
              <div className="cg-asst-text">{app.chat.assistant}</div>
              {app.noWidget ? (
                <div
                  className="cg-tool-result"
                  style={{ borderColor: `${accent}33` }}
                >
                  <div className="cg-tool-result-h">
                    <span
                      className="cg-tool-result-dot"
                      style={{ background: accent }}
                    ></span>
                    <span className="cg-tool-result-name">
                      {app.toolResult?.tool || "tool"}
                    </span>
                    <span className="cg-tool-result-sum">
                      {app.toolResult?.summary}
                    </span>
                  </div>
                  {app.toolResult?.items && (
                    <div className="cg-tool-result-rows">
                      {app.toolResult.items.map((it, i) => (
                        <div key={i} className="cg-tool-result-row">
                          <span className="cg-tr-route">{it.route}</span>
                          <span className="cg-tr-carrier">{it.carrier}</span>
                          <span className="cg-tr-time">{it.time}</span>
                          <span
                            className="cg-tr-price"
                            style={{ color: accent }}
                          >
                            {it.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                (() => {
                  const src = imageOverride || app.img;
                  return src ? (
                    <div className="cg-widget-wrap">
                      <Image
                        src={src}
                        alt={`${app.name} widget`}
                        className="cg-widget-img"
                        width={1200}
                        height={800}
                        sizes="(max-width: 768px) 90vw, 600px"
                        loading="lazy"
                      />
                    </div>
                  ) : null;
                })()
              )}
            </div>
          </div>
        </div>

        <div className="cg-composer">
          <div className="cg-composer-text">Ask anything</div>
          <div className="cg-composer-actions">
            <div className="cg-comp-ic">+</div>
            <div className="cg-comp-send" style={{ background: accent }}>
              ↑
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
