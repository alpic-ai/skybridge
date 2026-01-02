import { AppsSdkBridge } from "./apps-sdk-bridge.js";
import { BaseAdapter } from "./base-adapter.js";
import type { BridgeExternalStore } from "./hooks/types.js";
import type {
  BridgeInterface,
  CallToolResponse,
  DisplayMode,
} from "./types.js";

export class AppsSdkAdapter extends BaseAdapter {
  private static instance: AppsSdkAdapter | null = null;

  public static getInstance(): AppsSdkAdapter {
    if (!AppsSdkAdapter.instance) {
      AppsSdkAdapter.instance = new AppsSdkAdapter();
    }
    return AppsSdkAdapter.instance;
  }

  public static resetInstance(): void {
    AppsSdkAdapter.instance = null;
  }

  public getExternalStore<K extends keyof BridgeInterface>(
    key: K,
  ): BridgeExternalStore<K> {
    const bridge = AppsSdkBridge.getInstance();
    return {
      subscribe: bridge.subscribe(key),
      getSnapshot: () => bridge.getSnapshot(key),
    };
  }

  public callTool = async <
    ToolArgs extends Record<string, unknown> | null = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(
    name: string,
    args: ToolArgs,
  ): Promise<ToolResponse> => {
    return window.openai.callTool<ToolArgs, ToolResponse>(name, args);
  };

  public requestDisplayMode = (
    mode: DisplayMode,
  ): Promise<{ mode: DisplayMode }> => {
    return window.openai.requestDisplayMode({ mode });
  };

  public sendFollowUpMessage = (prompt: string): Promise<void> => {
    return window.openai.sendFollowUpMessage({ prompt });
  };
}
