import {
  type ReactNode,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  useInspectorPreferencesStore,
  useIsMobile,
} from "@/lib/inspector-preferences-store.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { PHONE_VIEWPORT } from "@/lib/utils.js";
import { ToolPanelToolbar } from "../tool-panel/tool-panel-toolbar.js";
import { View } from "../tool-panel/view/index.js";
import { ChatgptShell } from "./chatgpt-shell.js";
import { ClaudeShell } from "./claude-shell.js";

const FRAME_MARGIN_X = 24;
const FRAME_MARGIN_Y = 44;

const frameColors = {
  light: { backdrop: "#e8e8e6", label: "#6f6f6f" },
  dark: { backdrop: "#111110", label: "#8f8f8f" },
};

const PhoneFrame = ({
  theme,
  children,
}: {
  theme: "light" | "dark";
  children: ReactNode;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }
    const update = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      setScale(
        Math.min(
          1,
          (width - FRAME_MARGIN_X) / PHONE_VIEWPORT.width,
          (height - FRAME_MARGIN_Y) / PHONE_VIEWPORT.height,
        ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: frameColors[theme].backdrop }}
    >
      <div
        className="pb-1.5 font-mono text-xs"
        style={{ color: frameColors[theme].label }}
      >
        {PHONE_VIEWPORT.width} × {PHONE_VIEWPORT.height}
      </div>
      <div
        style={{
          width: PHONE_VIEWPORT.width * scale,
          height: PHONE_VIEWPORT.height * scale,
        }}
      >
        <div
          className="overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.2)]"
          style={{
            width: PHONE_VIEWPORT.width,
            height: PHONE_VIEWPORT.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const Preview = () => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");
  const previewClient = useInspectorPreferencesStore((s) => s.previewClient);
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const isMobile = useIsMobile();
  const templateUri = (tool?._meta?.ui as { resourceUri?: string } | undefined)
    ?.resourceUri;
  const hasWidget = Boolean(tool && data?.response && templateUri);
  const Shell = previewClient === "claude" ? ClaudeShell : ChatgptShell;

  const shell = (
    <Shell>
      {hasWidget ? (
        <Suspense fallback={null}>
          <View />
        </Suspense>
      ) : null}
    </Shell>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-3 bg-primary px-3 text-primary-foreground">
        <span className="font-medium text-xs">Preview mode</span>
        <div className="min-w-0 flex-1">
          <ToolPanelToolbar variant="preview" />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {isMobile ? <PhoneFrame theme={theme}>{shell}</PhoneFrame> : shell}
      </div>
    </div>
  );
};
