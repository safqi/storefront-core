import { Icon } from "@iconify/react";

/**
 * Thin wrapper over @iconify/react locked to the Solar set (`solar:`).
 * Pass the icon name without the prefix — e.g. <SolarIcon name="layers-minimalistic-linear" />.
 * Colour comes from `text-*` on the wrapper (the SVG inherits currentColor).
 *
 * NOTE: Prefer the shared <Icon> (./Icon.tsx) for new code — it resolves
 * semantic keys from the cross-project icon registry (e.g. name="cart"). This
 * wrapper is kept for existing raw-Solar call sites.
 */
export function SolarIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return <Icon icon={`solar:${name}`} className={className} aria-hidden="true" />;
}
