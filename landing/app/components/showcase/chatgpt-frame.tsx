import Image from "next-image-export-optimizer";
import type { ReactElement } from "react";
import { hostAccent, type ShowcaseApp } from "./data";

export { hostAccent };

const CLAUDE_STAR_LINES = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * Math.PI * 2;
  const inner = 2.6;
  const outer = 11.2;
  const cx = 12;
  const cy = 12;
  return {
    x1: cx + Math.cos(angle) * inner,
    y1: cy + Math.sin(angle) * inner,
    x2: cx + Math.cos(angle) * outer,
    y2: cy + Math.sin(angle) * outer,
  };
});

export const ClaudeStarSVG = ({
  size = 14,
}: {
  size?: number;
}): ReactElement => {
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
      {CLAUDE_STAR_LINES.map((line, index) => (
        <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
      ))}
    </svg>
  );
};

const HostLogo = ({ isClaude }: { isClaude: boolean }): ReactElement =>
  isClaude ? (
    <ClaudeStarSVG size={14} />
  ) : (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" />
    </svg>
  );

type ChatGPTFrameProps = {
  app: ShowcaseApp;
  compact?: boolean;
  imageOverride?: string;
  priority?: boolean;
};

export function ChatGPTFrame({
  app,
  compact = false,
  imageOverride,
  priority = false,
}: ChatGPTFrameProps) {
  const accent = hostAccent(app.host);
  const hostLower = (app.host || "").toLowerCase();
  const isClaude =
    hostLower.includes("claude") && !hostLower.includes("chatgpt");
  const modelLabel = isClaude ? "Claude Sonnet 4.5" : "ChatGPT 5";
  const widgetSrc = imageOverride || app.img;
  return (
    <div className={`cg-frame ${compact ? "is-compact" : ""}`}>
      {/* Sidebar */}
      <div className="cg-sidebar">
        <div className="cg-side-top">
          <div className="cg-logo">
            <HostLogo isClaude={isClaude} />
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
              <HostLogo isClaude={isClaude} />
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
                      {app.toolResult.items.map((item, index) => (
                        <div key={index} className="cg-tool-result-row">
                          <span className="cg-tr-route">{item.route}</span>
                          <span className="cg-tr-carrier">{item.carrier}</span>
                          <span className="cg-tr-time">{item.time}</span>
                          <span
                            className="cg-tr-price"
                            style={{ color: accent }}
                          >
                            {item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                widgetSrc && (
                  <div className="cg-widget-wrap">
                    <Image
                      src={widgetSrc}
                      alt={`${app.name} widget`}
                      className="cg-widget-img"
                      width={1200}
                      height={800}
                      sizes="(max-width: 768px) 90vw, 600px"
                      preload={priority}
                      fetchPriority={priority ? "high" : undefined}
                      loading={priority ? "eager" : "lazy"}
                    />
                  </div>
                )
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
