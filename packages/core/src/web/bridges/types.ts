export type Methods = {
  requestDisplayMode({ mode }: { mode: DisplayMode }): Promise<{
    mode: DisplayMode;
  }>;
  sendFollowUpMessage(prompt: string): Promise<void>;
};

export type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export interface BridgeInterface {
  theme: "light" | "dark";
  locale: string;
  displayMode: DisplayMode;
  safeArea: {
    insets: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  maxHeight: number;
  userAgent: {
    device: {
      type: DeviceType;
    };
    capabilities: {
      hover: boolean;
      touch: boolean;
    };
  };
}
