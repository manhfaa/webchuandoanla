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
  DjangoApiError,
  mapAccountToUserProfile,
  registerAuthTokenBridge,
  type DjangoAccount,
  type DjangoAccountPatch,
} from "@/lib/django-client";
import { normalizePlan } from "@/lib/plans";
import { normalizeUserDisplayName } from "@/lib/user-profile";
import { useLanguageStore } from "@/store/language-store";
import type { PlanTier, UserProfile } from "@/types";

/**
 * Same bilingual resolution as `useTr`, but readable outside of render. The
 * store writes `error` once, at the moment the request fails, so the message
 * lands in whichever language the reader had chosen.
 */
function trOffRender(vi: string, en: string) {
  return useLanguageStore.getState().language === "en" ? en : vi;
}

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
  loginWithGoogle: (payload: { credential: string; acceptedTerms?: boolean; turnstileToken?: string }) => Promise<void>;
  register: (payload: { email: string; password: string; acceptedTerms: boolean; turnstileToken: string }) => Promise<void>;
  logout: () => Promise<void>;
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
        try {
          set({ status: "loading", error: null });
          // Refresh via the HttpOnly cookie. On a one-time upgrade from v6,
          // refreshAccessToken also exchanges the old persisted token for it.
          const activeToken = await get().refreshAccessToken();
          if (!activeToken) {
            set({ user: null, isAuthenticated: false, initialized: true, status: "idle", error: null });
            return;
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
            error:
              err instanceof Error
                ? err.message
                : trOffRender("Không thể xác thực phiên đăng nhập.", "We couldn't verify your sign-in session."),
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
            refreshToken: null,
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
            error: err instanceof Error ? err.message : trOffRender("Đăng nhập thất bại.", "Sign-in failed."),
            isAuthenticated: false,
          });
          throw err;
        }
      },

      loginWithGoogle: async ({ credential, acceptedTerms, turnstileToken }) => {
        try {
          set({ status: "loading", error: null });
          const tokens = await djangoGoogleLogin({ credential, acceptedTerms, turnstileToken });
          const user = await djangoMe(tokens.access);
          set({
            accessToken: tokens.access,
            refreshToken: null,
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
            error:
              err instanceof Error ? err.message : trOffRender("Đăng nhập Google thất bại.", "Google sign-in failed."),
            isAuthenticated: false,
          });
          throw err;
        }
      },

      register: async ({ email, password, acceptedTerms, turnstileToken }) => {
        try {
          set({ status: "loading", error: null });
          await djangoRegister({ email, password, accepted_terms: acceptedTerms, turnstile_token: turnstileToken });
          set({ status: "idle", error: null });
        } catch (err) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            status: "error",
            error: err instanceof Error ? err.message : trOffRender("Đăng ký thất bại.", "Sign-up failed."),
            isAuthenticated: false,
          });
          throw err;
        }
      },

      logout: async () => {
        const storedRefresh = get().refreshToken;
        try {
          await djangoLogout(storedRefresh);
        } catch (error) {
          // The proxy clears cookies even when Django rejects the token or is
          // unavailable. A network failure before reaching the proxy does not.
          if (!(error instanceof DjangoApiError)) throw error;
        }
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          initialized: true,
          status: "idle",
          error: null,
        });
      },

      clearError: () => set({ error: null, status: "idle" }),

      // Used after a password reset, where the server hands back a token pair
      // for an identity the user has just proven control of by email.
      adoptSession: async ({ access }) => {
        set({ status: "loading", error: null });
        const user = await djangoMe(access);
        set({
          accessToken: access,
          refreshToken: null,
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

        inFlightRefresh = (async () => {
          try {
            const refreshed = await djangoRefreshToken(storedRefresh);
            set({
              accessToken: refreshed.access,
              refreshToken: null,
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
            error:
              err instanceof Error ? err.message : trOffRender("Không thể cập nhật hồ sơ.", "We couldn't update your profile."),
          });
          throw err;
        }
      },
    }),
    {
      name: "leafiq-session",
      // v6 drops the avatar placeholder that used to be persisted as if it were
      // the account's real avatar_url.
      version: 7,
      // The browser stores no credentials or profile. The server-side
      // HttpOnly cookie restores the session when the page reloads.
      partialize: () => ({}),
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
