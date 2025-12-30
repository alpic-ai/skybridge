export type Methods = {
  requestDisplayMode({ mode }: { mode: DisplayMode }): Promise<{
    mode: DisplayMode;
  }>;
};

export type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";

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
}
