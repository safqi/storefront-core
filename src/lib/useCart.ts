import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Cart } from "../types/commerce";
import {
  addCartItem,
  applyCoupon,
  clearCart,
  commerceKeys,
  fetchCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "./commerce";
import { useAuth } from "./auth";

/** Thrown by `add` when there is no session and the store doesn't allow guests. */
export class LoginRequiredError extends Error {
  constructor() {
    super("login_required");
    this.name = "LoginRequiredError";
  }
}

/**
 * Cart state for the storefront, backed by TanStack Query. The cart loads for
 * any session — a signed-in customer or a guest-checkout session; mutations
 * write the server's returned cart straight into the query cache so the
 * badge/totals update instantly.
 *
 * `add` starts a guest session first when the store allows guest checkout and
 * the shopper has no token; otherwise it rejects with `LoginRequiredError`, so
 * a theme can simply `add.mutate(...)` and send the shopper to /login on that.
 */
export function useCart() {
  const { hasSession, ensureSession } = useAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: commerceKeys.cart,
    queryFn: fetchCart,
    enabled: hasSession,
    staleTime: 0,
  });

  const setCart = (cart: Cart) => queryClient.setQueryData(commerceKeys.cart, cart);

  const add = useMutation({
    mutationFn: async (payload: Parameters<typeof addCartItem>[0]) => {
      if (!(await ensureSession())) throw new LoginRequiredError();
      return addCartItem(payload);
    },
    onSuccess: setCart,
  });

  const update = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: setCart,
  });

  const remove = useMutation({
    mutationFn: (itemId: number) => removeCartItem(itemId),
    onSuccess: setCart,
  });

  const clear = useMutation({
    mutationFn: clearCart,
    onSuccess: setCart,
  });

  const applyCouponMutation = useMutation({
    mutationFn: (code: string) => applyCoupon(code),
    onSuccess: setCart,
  });

  const removeCouponMutation = useMutation({
    mutationFn: removeCoupon,
    onSuccess: setCart,
  });

  const cart = cartQuery.data ?? null;

  return {
    cart,
    itemCount: cart?.item_count ?? 0,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    refetch: cartQuery.refetch,
    add,
    update,
    remove,
    clear,
    applyCoupon: applyCouponMutation,
    removeCoupon: removeCouponMutation,
  };
}
