"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  AVATAR_PLACEHOLDER,
  djangoGoogleLogin,
  djangoLogin,
  djangoLogout,
  djangoMe,
  djangoRefreshToken,
  djangoRegister,
  djangoUpdateMe,
  mapAccountToUserProfile,
  registerAuthTokenBridge,
  type DjangoAccount,
  type DjangoAccountPatch,
} from "@/lib/django-client";
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
  loginWithGoogle: (payload: { credential: string; acceptedTerms?: boolean }) => Promise<void>;
  register: (payload: { email: string; password: string; acceptedTerms: boolean }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshAccessToken: () => Promise<string | null>;
  adoptSession: (tokens: { access: string; refresh: string }) => Promise<void>;

  setPlan: (plan: PlanTier) => void;
  updateProfile: (payload: DjangoAccountPatch) => Promise<DjangoAccount>;
  applyAccount: (account: DjangoAccount) => void;
}

/** Concurrent 401s must share one refresh call, or rotation invalidates the
 * token the other requests are still holding. */
let inFlightRefresh: Promise<string | null> | null = null;

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
          let activeToken = accessToken;
          try {
            const user = await djangoMe(activeToken);
            set({
              user,
              isAuthenticated: true,
              initialized: true,
              status: "authenticated",
              error: null,
            });
            return;
          } catch (meError) {
            // The 30-minute access token has likely expired. Try the refresh
            // token before giving up, otherwise the user is signed out mid-session.
            const renewed = await get().refreshAccessToken();
            if (!renewed) throw meError;
            activeToken = renewed;
          }

          const user = await djangoMe(activeToken);
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

      loginWithGoogle: async ({ credential, acceptedTerms }) => {
        try {
          set({ status: "loading", error: null });
          const tokens = await djangoGoogleLogin({ credential, acceptedTerms });
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

      register: async ({ email, password, acceptedTerms }) => {
        try {
          set({ status: "loading", error: null });
          // The register endpoint returns the token pair itself, so the account
          // can no longer be created while the UI reports a failed sign-in.
          const tokens = await djangoRegister({ email, password, accepted_terms: acceptedTerms });
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

      logout: () => {
        const storedRefresh = get().refreshToken;
        // Clear locally first so the UI never waits on the network, then ask the
        // server to blacklist the refresh token — it stayed valid for its full
        // 7-day life when signing out was a client-side state reset.
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          initialized: true,
          status: "idle",
          error: null,
        });
        if (storedRefresh) {
          void djangoLogout(storedRefresh).catch(() => {
            // Offline or already invalid: the local session is gone either way.
          });
        }
      },

      clearError: () => set({ error: null, status: "idle" }),

      // Used after a password reset, where the server hands back a token pair
      // for an identity the user has just proven control of by email.
      adoptSession: async ({ access, refresh }) => {
        set({ status: "loading", error: null });
        const user = await djangoMe(access);
        set({
          accessToken: access,
          refreshToken: refresh,
          user,
          isAuthenticated: true,
          initialized: true,
          status: "authenticated",
          error: null,
        });
      },

      refreshAccessToken: async () => {
        if (inFlightRefresh) return inFlightRefresh;

        const storedRefresh = get().refreshToken;
        if (!storedRefresh) return null;

        inFlightRefresh = (async () => {
          try {
            const refreshed = await djangoRefreshToken(storedRefresh);
            set({
              accessToken: refreshed.access,
              ...(refreshed.refresh ? { refreshToken: refreshed.refresh } : {}),
            });
            return refreshed.access;
          } catch {
            // The refresh token is expired or blacklisted; the session is over.
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              initialized: true,
              status: "idle",
              error: null,
            });
            return null;
          } finally {
            inFlightRefresh = null;
          }
        })();

        return inFlightRefresh;
      },

      setPlan: (plan) =>
        set((state) => ({
          user: state.user ? { ...state.user, currentPlan: normalizePlan(plan) } : null,
          isAuthenticated: Boolean(state.user && state.accessToken),
          status: state.user ? "authenticated" : state.status,
          error: null,
        })),

      applyAccount: (account) =>
        set({
          user: mapAccountToUserProfile(account),
          isAuthenticated: true,
          status: "authenticated",
          error: null,
        }),

      updateProfile: async (payload) => {
        set({ status: "loading", error: null });
        try {
          const account = await djangoUpdateMe(payload);
          set({
            user: mapAccountToUserProfile(account),
            status: "authenticated",
            isAuthenticated: true,
            error: null,
          });
          return account;
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
      // v6 drops the avatar placeholder that used to be persisted as if it were
      // the account's real avatar_url.
      version: 6,
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
              avatar: state.user.avatar === AVATAR_PLACEHOLDER ? "" : (state.user.avatar ?? ""),
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

// Gives the API client a way to read and renew the access token without
// importing this store back (which would close an import cycle).
registerAuthTokenBridge({
  getAccessToken: () => useSessionStore.getState().accessToken,
  refreshAccessToken: () => useSessionStore.getState().refreshAccessToken(),
});
