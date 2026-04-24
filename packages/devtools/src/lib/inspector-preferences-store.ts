import type { AppsSdkContext } from "skybridge/web";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type InspectorPreferences = Pick<
  AppsSdkContext,
  "theme" | "locale" | "displayMode" | "maxHeight" | "safeArea" | "userAgent"
>;

type InspectorPreferencesStore = InspectorPreferences & {
  setPreference: <K extends keyof InspectorPreferences>(
    key: K,
    value: InspectorPreferences[K],
  ) => void;
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
      setPreference: (key, value) =>
        set({ [key]: value } as Partial<InspectorPreferences>),
    }),
    {
      name: "skybridge-devtools-inspector-preferences",
      version: 1,
    },
  ),
);

export const getInspectorPreferences = (): InspectorPreferences => {
  const { setPreference: _setPreference, ...preferences } =
    useInspectorPreferencesStore.getState();
  return preferences;
};
