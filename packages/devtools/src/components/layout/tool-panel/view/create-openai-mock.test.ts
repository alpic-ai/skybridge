import type { AppsSdkContext } from "skybridge/web";
import { describe, expect, it, vi } from "vitest";
import {
  defaultInspectorPreferences,
  useInspectorPreferencesStore,
} from "@/lib/inspector-preferences-store.js";
import { createAndInjectOpenAi } from "./create-openai-mock.js";

describe("createAndInjectOpenAi", () => {
  it("resets displayMode and openai.view.mode to inline when requestClose is called from modal mode", async () => {
    useInspectorPreferencesStore.setState({
      ...defaultInspectorPreferences,
      previewClient: null,
    });
    const iframeWindow = {
      dispatchEvent: vi.fn(),
    } as unknown as Window & { openai?: unknown };
    const setValue = vi.fn();
    const unsubscribe = createAndInjectOpenAi(
      iframeWindow,
      null,
      vi.fn(),
      setValue,
      vi.fn(),
      vi.fn(),
    );
    const openai = iframeWindow.openai as unknown as AppsSdkContext & {
      requestClose: () => Promise<void>;
      requestModal: (args: { params?: unknown }) => Promise<void>;
    };

    await openai.requestModal({ params: { id: 1 } });
    expect(openai.view).toEqual({ mode: "modal", params: { id: 1 } });

    await openai.requestClose();

    expect(useInspectorPreferencesStore.getState().displayMode).toBe("inline");
    expect(openai.view).toEqual({ mode: "inline" });
    expect(setValue).toHaveBeenCalledWith("view", { mode: "inline" });
    unsubscribe();
  });
});
