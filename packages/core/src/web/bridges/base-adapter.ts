import type { BridgeExternalStore } from "./hooks/types.js";
import type { BridgeInterface, Methods } from "./types.js";

export abstract class BaseAdapter implements Methods {
  public abstract getExternalStore<K extends keyof BridgeInterface>(
    key: K,
  ): BridgeExternalStore<K>;

  public abstract callTool: Methods["callTool"];
  public abstract requestDisplayMode: Methods["requestDisplayMode"];
  public abstract sendFollowUpMessage: Methods["sendFollowUpMessage"];

  public getMethod<K extends keyof Methods>(key: K): Methods[K] {
    return this[key];
  }
}
