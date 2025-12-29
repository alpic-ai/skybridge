export type IBridgeMethods = {
  requestDisplayMode({ mode }: { mode: BridgeDisplayMode }): Promise<{
    mode: BridgeDisplayMode;
  }>;
};

export type BridgeDisplayMode = "pip" | "inline" | "fullscreen" | "modal";

export interface BridgeInterface {
  theme: "light" | "dark";
  locale: string;
  displayMode: BridgeDisplayMode;
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
