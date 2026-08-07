import type { AppsSdkContext } from "skybridge/web";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type InspectorPreferences = Pick<
  AppsSdkContext,
  "theme" | "locale" | "displayMode" | "maxHeight" | "safeArea" | "userAgent"
>;

export type PreviewClient = "chatgpt" | "claude";

type InspectorPreferencesStore = InspectorPreferences & {
  previewClient: PreviewClient | null;
  setPreference: <K extends keyof InspectorPreferences>(
    key: K,
    value: InspectorPreferences[K],
  ) => void;
  setPreviewClient: (previewClient: PreviewClient | null) => void;
};

export const defaultInspectorPreferences: InspectorPreferences = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  maxHeight: undefined,
  safeArea: {
    insets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  },
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
};

export const useInspectorPreferencesStore = create<InspectorPreferencesStore>()(
  persist(
    (set) => ({
      ...defaultInspectorPreferences,
      previewClient: null,
      setPreference: (key, value) =>
        set({ [key]: value } as Partial<InspectorPreferences>),
      setPreviewClient: (previewClient) => set({ previewClient }),
    }),
    {
      name: "skybridge-devtools-inspector-preferences",
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Omit<InspectorPreferences, "displayMode"> & {
          displayMode?: InspectorPreferences["displayMode"];
        };
        if (version < 2) {
          delete state.displayMode;
        }
        return state;
      },
      partialize: ({
        displayMode: _displayMode,
        previewClient: _previewClient,
        setPreference: _setPreference,
        setPreviewClient: _setPreviewClient,
        ...state
      }) => state,
    },
  ),
);

export const getInspectorPreferences = (): InspectorPreferences => {
  const {
    setPreference: _setPreference,
    setPreviewClient: _setPreviewClient,
    previewClient: _previewClient,
    ...preferences
  } = useInspectorPreferencesStore.getState();
  return preferences;
};
