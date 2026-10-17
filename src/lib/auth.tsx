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
import {
  createGuestSession,
  fetchMe,
  guestCheckoutEnabled,
  logoutRequest,
} from "./commerce";

/**
 * Storefront auth state. The Sanctum bearer token lives in localStorage and is
 * attached to every axios request; on boot we hydrate the current customer via
 * `/auth/me`. Consumed through `useAuth()`.
 *
 * Guest checkout: when the store allows it (`appConfig.GUEST_CHECKOUT`), a
 * shopper without an account gets a *guest session* — a token for a hidden
 * guest account, flagged with `sf_guest` so we know synchronously on reload.
 * `isAuthenticated` stays false for a guest (account UI keeps asking to log in);
 * `hasSession` is true for both. Logging in while the guest token is still
 * attached makes the backend merge the guest's cart + orders into the account.
 */

const TOKEN_KEY = "sf_token";
const GUEST_KEY = "sf_guest";

interface AuthContextValue {
  token: string | null;
  user: Customer | null;
  /** A real (non-guest) signed-in account. */
  isAuthenticated: boolean;
  /** The current token is a guest-checkout session. */
  isGuest: boolean;
  /** Any token — real account or guest. Cart/checkout/orders work with either. */
  hasSession: boolean;
  /** Guest checkout is switched on for this store. */
  guestCheckout: boolean;
  loading: boolean;
  login: (token: string, user: Customer) => void;
  logout: () => void;
  /**
   * Make sure a token exists before a cart/checkout call: resolves `true` when
   * one already does, starts a guest session when the store allows guests, and
   * resolves `false` when the shopper must log in.
   */
  ensureSession: () => Promise<boolean>;
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

function readGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

function persist(token: string | null, guest: boolean) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (token && guest) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
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
  const [isGuest, setIsGuest] = useState<boolean>(() => !!readToken() && readGuestFlag());
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
        if (!cancelled) {
          setUser(u);
          setIsGuest(!!u.is_guest);
          persist(token, !!u.is_guest);
        }
      })
      .catch(() => {
        // Token invalid/expired (or a guest token after the store switched
        // guest checkout off) — clear it.
        if (!cancelled) {
          persist(null, false);
          applyToken(null);
          setToken(null);
          setIsGuest(false);
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
      const guest = !!newUser.is_guest;
      persist(newToken, guest);
      applyToken(newToken);
      setToken(newToken);
      setIsGuest(guest);
      setUser(newUser);
      // A real login may have merged a guest cart/orders server-side.
      if (!guest) queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const ensureSession = useCallback(async (): Promise<boolean> => {
    if (readToken()) return true;
    if (!guestCheckoutEnabled()) return false;
    try {
      const { token: guestToken, user: guestUser } = await createGuestSession();
      login(guestToken, guestUser);
      return true;
    } catch {
      return false;
    }
  }, [login]);

  const logout = useCallback(() => {
    logoutRequest().catch(() => {
      /* best-effort revoke */
    });
    persist(null, false);
    applyToken(null);
    setToken(null);
    setIsGuest(false);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: !!token && !isGuest,
      isGuest: !!token && isGuest,
      hasSession: !!token,
      guestCheckout: guestCheckoutEnabled(),
      loading,
      login,
      logout,
      ensureSession,
    }),
    [token, user, isGuest, loading, login, logout, ensureSession],
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
