import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import type { Customer } from "../types/commerce";
import { fetchMe, logoutRequest } from "./commerce";

/**
 * Storefront auth state. The Sanctum bearer token lives in localStorage and is
 * attached to every axios request; on boot we hydrate the current customer via
 * `/auth/me`. Consumed through `useAuth()`.
 */

const TOKEN_KEY = "sf_token";

interface AuthContextValue {
  token: string | null;
  user: Customer | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: Customer) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Read the persisted token once at module load and prime the axios header. */
function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function applyToken(token: string | null) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => {
    const t = readToken();
    applyToken(t);
    return t;
  });
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);

  // Hydrate the current customer when a token is present (e.g. on reload).
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        // Token invalid/expired — clear it.
        if (!cancelled) {
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* ignore */
          }
          applyToken(null);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(
    (newToken: string, newUser: Customer) => {
      try {
        localStorage.setItem(TOKEN_KEY, newToken);
      } catch {
        /* ignore */
      }
      applyToken(newToken);
      setToken(newToken);
      setUser(newUser);
    },
    [],
  );

  const logout = useCallback(() => {
    logoutRequest().catch(() => {
      /* best-effort revoke */
    });
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    applyToken(null);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      loading,
      login,
      logout,
    }),
    [token, user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
