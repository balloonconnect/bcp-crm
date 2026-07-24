"use client";

import * as React from "react";
import { apiPost, apiGet, setAccessToken } from "./api-client";

export interface PlatformAuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: { key: string; name: string }[];
  permissions: string[];
}

interface PlatformAuthState {
  user: PlatformAuthUser | null;
  loading: boolean;
  /** Set only mid-login, when the account has 2FA enabled and a code is required to finish. */
  twoFactorChallenge: string | null;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean }>;
  completeTwoFactor: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PlatformAuthContext = React.createContext<PlatformAuthState | null>(null);

/**
 * This provider talks exclusively to `/platform-auth/*` — a completely
 * separate set of endpoints, cookies (`bcp_platform_refresh_token`, scoped
 * to `/platform-auth`), and session/permission model from the Studio CRM's
 * `/auth/*` (`bcp_refresh_token`, scoped to `/auth`). A platform staff
 * session and a studio user session cannot be confused with each other —
 * see docs/platform-admin.md § "Separate authentication and permission
 * layer" for the full architecture this relies on
 * (`@bcp/auth`/`@bcp/permissions`'s `PlatformUser`/`PlatformRole` plane,
 * entirely distinct from `StudioUser`/`StudioRole`).
 */
export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<PlatformAuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [twoFactorChallenge, setTwoFactorChallenge] = React.useState<string | null>(null);

  const loadCurrentUser = React.useCallback(async () => {
    const res = await apiGet<PlatformAuthUser>("/platform-auth/me");
    if (res.ok && res.data) {
      setUser(res.data);
    } else {
      setUser(null);
    }
  }, []);

  React.useEffect(() => {
    // Attempt a silent refresh on load — the httpOnly refresh cookie
    // survives a page reload even though the in-memory access token doesn't.
    (async () => {
      const refreshed = await apiPost<{ accessToken: string }>("/platform-auth/refresh");
      if (refreshed.ok && refreshed.data) {
        setAccessToken(refreshed.data.accessToken);
        await loadCurrentUser();
      }
      setLoading(false);
    })();
  }, [loadCurrentUser]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await apiPost<{ accessToken?: string; requiresTwoFactor?: boolean; challengeToken?: string }>(
        "/platform-auth/login",
        { email, password },
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message ?? "Login failed");
      }
      if (res.data.requiresTwoFactor && res.data.challengeToken) {
        setTwoFactorChallenge(res.data.challengeToken);
        return { requiresTwoFactor: true };
      }
      if (res.data.accessToken) {
        setAccessToken(res.data.accessToken);
        await loadCurrentUser();
      }
      return { requiresTwoFactor: false };
    },
    [loadCurrentUser],
  );

  const completeTwoFactor = React.useCallback(
    async (code: string) => {
      if (!twoFactorChallenge) throw new Error("No two-factor challenge in progress");
      const res = await apiPost<{ accessToken: string }>("/platform-auth/2fa/challenge", {
        challengeToken: twoFactorChallenge,
        code,
      });
      if (!res.ok || !res.data) throw new Error(res.error?.message ?? "Invalid code");
      setAccessToken(res.data.accessToken);
      setTwoFactorChallenge(null);
      await loadCurrentUser();
    },
    [twoFactorChallenge, loadCurrentUser],
  );

  const logout = React.useCallback(async () => {
    await apiPost("/platform-auth/logout");
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, loading, twoFactorChallenge, login, completeTwoFactor, logout }),
    [user, loading, twoFactorChallenge, login, completeTwoFactor, logout],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth(): PlatformAuthState {
  const ctx = React.useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used within a <PlatformAuthProvider>");
  return ctx;
}
