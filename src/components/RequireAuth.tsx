import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

/**
 * Route guard for authenticated storefront surfaces (cart, checkout, orders,
 * account). Redirects unauthenticated visitors to /login, remembering where
 * they were headed so login can send them back.
 *
 * `allowGuest` (cart / checkout / order pages): a guest-checkout session also
 * passes, and when the store allows guest checkout one is started on the spot.
 * Leave it off for account pages — a guest is sent to /login there.
 */
export default function RequireAuth({
  children,
  allowGuest = false,
}: {
  children: React.ReactNode;
  allowGuest?: boolean;
}) {
  const { isAuthenticated, hasSession, guestCheckout, loading, ensureSession } = useAuth();
  const location = useLocation();
  const wantsGuest = allowGuest && guestCheckout && !hasSession;
  const [starting, setStarting] = useState(wantsGuest);

  useEffect(() => {
    if (!wantsGuest) return;
    let cancelled = false;
    setStarting(true);
    ensureSession().finally(() => {
      if (!cancelled) setStarting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [wantsGuest, ensureSession]);

  if (loading || starting) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-3 border-t-accent" />
      </div>
    );
  }

  const allowed = allowGuest ? hasSession : isAuthenticated;

  if (!allowed) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <>{children}</>;
}
