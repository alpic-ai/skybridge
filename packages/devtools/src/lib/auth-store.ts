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
  error: string | null;

  setStatus: (status: AuthStatus) => void;
  setRequiresAuth: (requires: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: "idle",
  requiresAuth: false,
  error: null,

  setStatus: (status) => set({ status }),
  setRequiresAuth: (requiresAuth) => set({ requiresAuth }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      status: "idle",
      requiresAuth: false,
      error: null,
    }),
}));
