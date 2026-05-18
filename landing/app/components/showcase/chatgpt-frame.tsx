import {
  Code,
  Folder,
  Images,
  MessageCircle,
  MessagesSquare,
  Plus,
  Search,
  SquarePen,
} from "lucide-react";
import Image from "next-image-export-optimizer";
import type { ReactElement } from "react";
import type { ShowcaseApp, ShowcasePreview } from "./data";

export const ClaudeStarSVG = ({
  size = 14,
}: {
  size?: number;
}): ReactElement => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z" />
  </svg>
);

const OpenAILogo = ({ size = 14 }: { size?: number }): ReactElement => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071.005l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.124 7.2a.076.076 0 0 1 .071-.005l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.664zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.681 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.361l2.602-1.502 2.603 1.502v3.003l-2.603 1.502-2.602-1.502z" />
  </svg>
);

const HostLogo = ({ isClaude }: { isClaude: boolean }): ReactElement =>
  isClaude ? <ClaudeStarSVG size={14} /> : <OpenAILogo size={14} />;

type ChatGPTFrameProps = {
  app: ShowcaseApp;
  compact?: boolean;
  priority?: boolean;
  /** When set (e.g. carousel slide), drives host chrome, fullscreen vs inline, thread copy, screenshot. */
  preview?: ShowcasePreview;
};

function FrameTopbar({ modelLabel }: { modelLabel: string }): ReactElement {
  return (
    <div className="cg-topbar">
      <div className="cg-model">
        <span>{modelLabel}</span>
      </div>
    </div>
  );
}

function ChatGPTSidebar({ appName }: { appName: string }): ReactElement {
  return (
    <div className="cg-sidebar">
      <div className="cg-side-top">
        <div className="cg-logo">
          <OpenAILogo size={14} />
        </div>
        <div className="cg-side-icons">
          <div className="cg-side-ic">
            <SquarePen size={14} strokeWidth={1.5} />
          </div>
          <div className="cg-side-ic">
            <Search size={14} strokeWidth={1.5} />
          </div>
          <div className="cg-side-ic">
            <MessageCircle size={14} strokeWidth={1.5} />
          </div>
          <div className="cg-side-ic">
            <Images size={14} strokeWidth={1.5} />
          </div>
        </div>
      </div>
      <div className="cg-side-section">
        <div className="cg-side-label">Chats</div>
        <div className="cg-side-item is-active">{appName}</div>
        <div className="cg-side-item">Trip planning</div>
        <div className="cg-side-item">Recipe ideas</div>
        <div className="cg-side-item">Refactor notes</div>
      </div>
    </div>
  );
}

function ClaudeSidebar(): ReactElement {
  return (
    <div className="cg-sidebar cg-sidebar--claude">
      <div className="cg-side-top">
        <div className="cg-claude-logo">
          <ClaudeStarSVG size={16} />
        </div>
        <div className="cg-side-icons">
          <div className="cg-side-ic">
            <Plus size={14} strokeWidth={1.5} />
          </div>
          <div className="cg-side-ic">
            <Search size={14} strokeWidth={1.5} />
          </div>
          <div className="cg-side-ic">
            <MessagesSquare size={14} strokeWidth={1.5} />
          </div>
          <div className="cg-side-ic">
            <Folder size={14} strokeWidth={1.5} />
          </div>
          <div className="cg-side-ic">
            <Code size={14} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FrameSidebar({
  isClaude,
  appName,
}: {
  isClaude: boolean;
  appName: string;
}): ReactElement {
  if (isClaude) {
    return <ClaudeSidebar />;
  }
  return <ChatGPTSidebar appName={appName} />;
}

function FrameComposer(): ReactElement {
  return (
    <div className="cg-composer">
      <div className="cg-composer-text">
        Ask anything
        <div className="cg-composer-actions">
          <div className="cg-comp-ic">+</div>
        </div>
      </div>
    </div>
  );
}

export function ChatGPTFrame({
  app,
  compact = false,
  priority = false,
  preview,
}: ChatGPTFrameProps) {
  const accent = app.accent;
  const hostLower = (app.host || "").toLowerCase();
  const legacyClaude =
    hostLower.includes("claude") && !hostLower.includes("chatgpt");

  const isClaude = preview ? preview.mode.includes("claude") : legacyClaude;
  const isFullscreen = preview ? preview.mode.includes("fullscreen") : false;
  const chat = preview && "chat" in preview ? preview.chat : app.chat;
  const widgetSrc = preview
    ? preview.screenshot.length > 0
      ? preview.screenshot
      : undefined
    : app.img;

  const modelLabel = isClaude ? "Claude" : "ChatGPT";

  const showToolResult = Boolean(app.noWidget && !widgetSrc);

  const content =
    isFullscreen && widgetSrc ? (
      <div className="cg-fullscreen-stage">
        <div className="cg-widget-wrap cg-widget-wrap--fullscreen">
          <Image
            src={widgetSrc}
            alt={`${app.name} — fullscreen preview`}
            fill
            sizes="(max-width: 768px) 92vw, 700px"
            preload={priority}
            fetchPriority={priority ? "high" : undefined}
            loading={priority ? "eager" : "lazy"}
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>
    ) : (
      <div className="cg-thread">
        <div className="cg-user-row">
          <div className="cg-user-bubble">{chat.user}</div>
        </div>

        <div className="cg-asst-row">
          <div className="cg-asst-icon">
            {app.icon ? (
              <Image
                src={app.icon}
                alt={app.name}
                width={20}
                height={20}
                className="cg-asst-icon-img"
              />
            ) : (
              <HostLogo isClaude={isClaude} />
            )}
          </div>
          <div className="cg-asst-body">
            <div className="cg-toolcall">
              <span
                className="cg-tool-dot"
                style={{ background: accent }}
              ></span>
              <span className="cg-tool-app">{app.name}</span>
            </div>
            <div className="cg-asst-text">{chat.assistant}</div>
            {showToolResult ? (
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
                        <span className="cg-tr-price" style={{ color: accent }}>
                          {item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              widgetSrc && (
                <div className="cg-widget-wrap cg-widget-wrap--inline">
                  <Image
                    src={widgetSrc}
                    alt={`${app.name} widget`}
                    className="cg-widget-img cg-widget-img--inline"
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
    );

  return (
    <div
      className={`cg-frame ${compact ? "is-compact" : ""} ${isFullscreen ? "is-fullscreen" : ""} ${isClaude ? "is-claude" : ""}`}
    >
      <FrameSidebar isClaude={isClaude} appName={app.name} />
      <div className={`cg-main ${isFullscreen ? "cg-main-fullbleed" : ""}`}>
        <FrameTopbar modelLabel={modelLabel} />
        {content}
        <FrameComposer />
      </div>
    </div>
  );
}
