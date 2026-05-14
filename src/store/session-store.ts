"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PlanTier, UserProfile } from "@/types";
import { djangoLogin, djangoMe, djangoRegister } from "@/lib/django-client";

type AuthStatus = "idle" | "loading" | "authenticated" | "error";

interface SessionState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  initialized: boolean;
  status: AuthStatus;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;

  hydrate: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  loginLocalFallback: (payload?: { email?: string }) => void;

  setPlan: (plan: PlanTier) => void;
  updateProfileLocal: (payload: { name: string; email: string }) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      initialized: false,
      status: "idle",
      error: null,
      accessToken: null,
      refreshToken: null,

      hydrate: async () => {
        const accessToken = get().accessToken;
        const cachedUser = get().user;
        if (cachedUser) {
          set({
            user: cachedUser,
            isAuthenticated: true,
            initialized: true,
            status: "authenticated",
            error: null,
          });
        } else {
          set({
            initialized: true,
            isAuthenticated: false,
            status: "idle",
            error: null,
          });
        }

        if (!accessToken) {
          return;
        }

        try {
          set({ status: cachedUser ? "authenticated" : "loading", error: null });
          const user = await djangoMe(accessToken);
          set({
            user,
            isAuthenticated: true,
            initialized: true,
            status: "authenticated",
            error: null,
          });
        } catch (err) {
          if (cachedUser) {
            set({
              user: cachedUser,
              isAuthenticated: true,
              initialized: true,
              status: "authenticated",
              error: null,
              accessToken: null,
              refreshToken: null,
            });
            return;
          }
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            initialized: true,
            status: "error",
            error:
              err instanceof Error ? err.message : "Không thể xác thực phiên đăng nhập.",
          });
        }
      },

      login: async ({ email, password }) => {
        try {
          set({ status: "loading", error: null });
          const tokens = await djangoLogin({ email, password });
          const user = await djangoMe(tokens.access);
          set({
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
            user,
            isAuthenticated: true,
            initialized: true,
            status: "authenticated",
          });
        } catch (err) {
          set({
            status: "error",
            error: err instanceof Error ? err.message : "Đăng nhập thất bại.",
            isAuthenticated: false,
          });
          throw err;
        }
      },

      register: async ({ email, password }) => {
        try {
          set({ status: "loading", error: null });
          await djangoRegister({ email, password });
          const tokens = await djangoLogin({ email, password });
          const user = await djangoMe(tokens.access);
          set({
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
            user,
            isAuthenticated: true,
            initialized: true,
            status: "authenticated",
          });
        } catch (err) {
          set({
            status: "error",
            error: err instanceof Error ? err.message : "Đăng ký thất bại.",
            isAuthenticated: false,
          });
          throw err;
        }
      },

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          initialized: true,
          status: "idle",
          error: null,
        }),

      clearError: () => set({ error: null, status: "idle" }),

      loginLocalFallback: ({ email } = {}) =>
        set({
          user: {
            name: "Người dùng Agromind AI",
            email: email?.trim() || "demo@agromindai.vn",
            avatar: "/avatars/user-demo.svg",
            currentPlan: "free",
          },
          isAuthenticated: true,
          initialized: true,
          status: "authenticated",
          error: null,
          accessToken: null,
          refreshToken: null,
        }),

      setPlan: (plan) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                currentPlan: plan,
              }
            : {
                name: "Người dùng Agromind AI",
                email: "demo@agromindai.vn",
                avatar: "/avatars/user-demo.svg",
                currentPlan: plan,
              },
          isAuthenticated: true,
          initialized: true,
          status: "authenticated",
          error: null,
        })),

      updateProfileLocal: ({ name, email }) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                name,
                email,
              }
            : null,
        })),
    }),
    {
      name: "leafiq-session",
      version: 2,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as Partial<SessionState>;
        return {
          ...state,
          isAuthenticated: Boolean(state.user || state.isAuthenticated),
        };
      },
    },
  ),
);
