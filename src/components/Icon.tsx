import { Icon as Iconify } from "@iconify/react";
import { ICONS, resolveIcon, type IconName } from "../lib/iconMap";

/**
 * App icon. Renders an Iconify glyph from the shared semantic registry.
 *
 *   <Icon name="cart" className="text-lg" />        // semantic key
 *   <Icon name="solar:bag-3-bold" />                // raw iconify id
 *   <Icon name="magnifer-linear" />                 // bare solar name
 *
 * Colour follows `currentColor`, so drive it with a `text-*` class on the icon
 * (or a parent). Size is font-size driven — `text-lg`, `text-2xl`, etc.
 */
export function Icon({
    name,
    className = "",
}: {
    // Autocomplete on semantic keys, but any raw iconify id is allowed too.
    name: IconName | (string & {});
    className?: string;
}) {
    return (
        <Iconify icon={resolveIcon(name)} className={className} aria-hidden="true" />
    );
}

export { ICONS, resolveIcon };
export type { IconName };
export default Icon;
