import { create } from "zustand";

export type AuthStatus =
  | "idle"
  | "connecting"
  | "authenticated"
  | "unauthenticated"
  | "error";

type AuthState = {
  status: AuthStatus;
  requiresAuth: boolean;
  hasAuthRequiredTools: boolean;
  isSignedIn: boolean;
  error: string | null;

  setStatus: (status: AuthStatus) => void;
  setRequiresAuth: (requires: boolean) => void;
  setHasAuthRequiredTools: (value: boolean) => void;
  setIsSignedIn: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: "idle",
  requiresAuth: false,
  hasAuthRequiredTools: false,
  isSignedIn: false,
  error: null,

  setStatus: (status) => set({ status }),
  setRequiresAuth: (requiresAuth) => set({ requiresAuth }),
  setHasAuthRequiredTools: (hasAuthRequiredTools) =>
    set({ hasAuthRequiredTools }),
  setIsSignedIn: (isSignedIn) => set({ isSignedIn }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      status: "idle",
      requiresAuth: false,
      hasAuthRequiredTools: false,
      isSignedIn: false,
      error: null,
    }),
}));
