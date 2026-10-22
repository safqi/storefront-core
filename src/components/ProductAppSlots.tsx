import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { getAppApiUrl, getAppLang } from "../lib/appConfig";
import { getAuthToken } from "../lib/auth";
import {
  getAppRegistry,
  getProductSlots,
  injectSlotStyle,
  type AppSlotContext,
  type AppSlotHandler,
  type ProductSlotDecl,
  type ProductSlotPosition,
} from "../lib/appSlots";

/**
 * Mount point for product-page UI contributed by installed apps. A theme
 * renders it once per position on its product page:
 *
 *   <ProductAppSlots product={product} variant={selected} position="below_variants" />
 *
 * Renders nothing — and fires no request — when no installed app declares a
 * slot at that position. See lib/appSlots.ts for the app-side contract.
 */

export interface ProductAppSlotsProps {
  product: { id: number; slug: string; name: string };
  variant?: { id: number; name?: string | null } | null;
  position: ProductSlotPosition;
  className?: string;
}

interface SlotPayload {
  html: string;
  css: string | null;
}

async function fetchProductSlot(slug: string, key: string, product: string): Promise<SlotPayload | null> {
  const res = await axios.get(getAppApiUrl(slug, `product-slots/${encodeURIComponent(key)}`), {
    params: { product },
  });

  // 204 = the app has nothing for this product.
  if (res.status === 204 || !res.data?.html) return null;

  return { html: String(res.data.html), css: res.data.css ? String(res.data.css) : null };
}

/** The app's handler, re-rendering when it registers after this mounts. */
function useAppHandler(slug: string): AppSlotHandler | undefined {
  const registry = getAppRegistry();
  const [handler, setHandler] = useState(() => registry.get(slug));

  useEffect(() => {
    setHandler(registry.get(slug));
    return registry.subscribe((registered) => {
      if (registered === slug) setHandler(registry.get(slug));
    });
  }, [registry, slug]);

  return handler;
}

function ProductAppSlot({
  slot,
  product,
  variant,
}: {
  slot: ProductSlotDecl & { slug: string };
  product: ProductAppSlotsProps["product"];
  variant: ProductAppSlotsProps["variant"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handler = useAppHandler(slot.slug);

  const { data } = useQuery({
    queryKey: ["app-product-slot", slot.slug, slot.key, product.slug],
    queryFn: () => fetchProductSlot(slot.slug, slot.key, product.slug),
    staleTime: 5 * 60 * 1000,
  });

  // Latest context for update(); the mount effect reads it once.
  const ctx: AppSlotContext = {
    slug: slot.slug,
    key: slot.key,
    product: { id: product.id, slug: product.slug, name: product.name },
    variant: variant ? { id: variant.id, name: variant.name ?? null } : null,
    apiUrl: getAppApiUrl(slot.slug),
    token: getAuthToken,
    lang: getAppLang(),
  };
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // Inject markup imperatively (not dangerouslySetInnerHTML) so React never
  // re-applies it over DOM the app's script has since changed.
  useEffect(() => {
    const el = ref.current;
    if (!el || !data) return;

    injectSlotStyle(`${slot.slug}:${slot.key}`, data.css);
    el.innerHTML = data.html;

    if (!handler) return;

    const mountCtx = ctxRef.current;
    try {
      handler.mount(el, mountCtx);
    } catch (e) {
      console.error(`[app-slot] ${slot.slug} mount failed`, e);
    }

    return () => {
      try {
        handler.unmount?.(el, mountCtx);
      } catch (e) {
        console.error(`[app-slot] ${slot.slug} unmount failed`, e);
      }
    };
  }, [data, handler, slot.slug, slot.key]);

  const variantId = variant?.id ?? null;
  useEffect(() => {
    const el = ref.current;
    if (!el || !data || !handler?.update) return;
    try {
      handler.update(el, ctxRef.current);
    } catch (e) {
      console.error(`[app-slot] ${slot.slug} update failed`, e);
    }
  }, [variantId, data, handler, slot.slug]);

  if (!data) return null;

  return <div ref={ref} className="sf-app-slot" data-app-slot={`${slot.slug}:${slot.key}`} />;
}

export function ProductAppSlots({ product, variant = null, position, className }: ProductAppSlotsProps) {
  const slots = getProductSlots(position);
  if (slots.length === 0 || !product?.slug) return null;

  const items = slots.map((slot) => (
    <ProductAppSlot key={`${slot.slug}:${slot.key}`} slot={slot} product={product} variant={variant} />
  ));

  return className ? <div className={className}>{items}</div> : <>{items}</>;
}

export default ProductAppSlots;
