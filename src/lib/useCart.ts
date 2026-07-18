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

/**
 * Cart state for the storefront, backed by TanStack Query. The cart only loads
 * for an authenticated customer; mutations write the server's returned cart
 * straight into the query cache so the badge/totals update instantly.
 */
export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: commerceKeys.cart,
    queryFn: fetchCart,
    enabled: isAuthenticated,
    staleTime: 0,
  });

  const setCart = (cart: Cart) => queryClient.setQueryData(commerceKeys.cart, cart);

  const add = useMutation({
    mutationFn: addCartItem,
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
