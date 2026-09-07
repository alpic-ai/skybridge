import type { AppsSdkContext } from "skybridge/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultInspectorPreferences,
  useInspectorPreferencesStore,
} from "@/lib/inspector-preferences-store.js";
import { createAndInjectOpenAi } from "./create-openai-mock.js";

describe("createAndInjectOpenAi", () => {
  beforeEach(() => {
    useInspectorPreferencesStore.setState({
      ...defaultInspectorPreferences,
      previewClient: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup() {
    const iframeWindow = {
      dispatchEvent: vi.fn(),
    } as unknown as Window & { openai?: unknown };
    const setValue = vi.fn();
    createAndInjectOpenAi(
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
    return { openai, setValue };
  }

  it("resets displayMode and openai.view.mode to inline when requestClose is called from modal mode", async () => {
    const { openai, setValue } = setup();

    await openai.requestModal({ params: { id: 1 } });
    expect(useInspectorPreferencesStore.getState().displayMode).toBe("modal");
    expect(openai.view).toEqual({ mode: "modal", params: { id: 1 } });

    await openai.requestClose();

    expect(useInspectorPreferencesStore.getState().displayMode).toBe("inline");
    expect(openai.view).toEqual({ mode: "inline" });
    expect(setValue).toHaveBeenCalledWith("view", { mode: "inline" });
  });

  it("is a no-op when not in modal mode", async () => {
    const { openai, setValue } = setup();

    await openai.requestClose();

    expect(useInspectorPreferencesStore.getState().displayMode).toBe("inline");
    expect(openai.view).toBeUndefined();
    expect(setValue).not.toHaveBeenCalledWith("view", expect.anything());
  });
});
