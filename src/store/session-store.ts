"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { djangoGoogleLogin, djangoLogin, djangoMe, djangoRegister, djangoUpdateMe } from "@/lib/django-client";
import { normalizePlan } from "@/lib/plans";
import { normalizeUserDisplayName } from "@/lib/user-profile";
import type { PlanTier, UserProfile } from "@/types";

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
  loginWithGoogle: (payload: { credential: string }) => Promise<void>;
  register: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;

  setPlan: (plan: PlanTier) => void;
  updateProfile: (payload: { name: string; email: string; avatar?: string }) => Promise<void>;
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
        if (!accessToken) {
          set({
            user: null,
            isAuthenticated: false,
            initialized: true,
            status: "idle",
            error: null,
            refreshToken: null,
          });
          return;
        }

        try {
          set({ status: "loading", error: null });
          const user = await djangoMe(accessToken);
          set({
            user,
            isAuthenticated: true,
            initialized: true,
            status: "authenticated",
            error: null,
          });
        } catch (err) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            initialized: true,
            status: "error",
            error: err instanceof Error ? err.message : "Không thể xác thực phiên đăng nhập.",
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
            error: null,
          });
        } catch (err) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            status: "error",
            error: err instanceof Error ? err.message : "Đăng nhập thất bại.",
            isAuthenticated: false,
          });
          throw err;
        }
      },

      loginWithGoogle: async ({ credential }) => {
        try {
          set({ status: "loading", error: null });
          const tokens = await djangoGoogleLogin({ credential });
          const user = await djangoMe(tokens.access);
          set({
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
            user,
            isAuthenticated: true,
            initialized: true,
            status: "authenticated",
            error: null,
          });
        } catch (err) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            status: "error",
            error: err instanceof Error ? err.message : "Đăng nhập Google thất bại.",
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
            error: null,
          });
        } catch (err) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
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

      setPlan: (plan) =>
        set((state) => ({
          user: state.user ? { ...state.user, currentPlan: normalizePlan(plan) } : null,
          isAuthenticated: Boolean(state.user && state.accessToken),
          status: state.user ? "authenticated" : state.status,
          error: null,
        })),

      updateProfile: async ({ name, email, avatar }) => {
        const accessToken = get().accessToken;
        if (!accessToken) {
          throw new Error("Bạn cần đăng nhập lại để cập nhật hồ sơ.");
        }
        set({ status: "loading", error: null });
        try {
          const user = await djangoUpdateMe(accessToken, {
            full_name: name,
            email,
            ...(avatar ? { avatar_url: avatar } : {}),
          });
          set({ user, status: "authenticated", isAuthenticated: true, error: null });
        } catch (err) {
          set({
            status: "error",
            error: err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.",
          });
          throw err;
        }
      },
    }),
    {
      name: "leafiq-session",
      version: 5,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as Partial<SessionState>;
        const user = state.user
          ? {
              ...state.user,
              name: normalizeUserDisplayName(state.user.name),
              currentPlan: normalizePlan(state.user.currentPlan),
            }
          : null;
        return {
          ...state,
          user: state.accessToken ? user : null,
          isAuthenticated: Boolean(state.accessToken && user),
        };
      },
    },
  ),
);
