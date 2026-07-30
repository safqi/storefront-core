import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface SmartLinkProps {
  /** Resolved href. An absolute http(s) URL opens in a new tab. */
  href: string;
  className?: string;
  children: ReactNode;
}

/** Whether an href leaves the storefront. */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * One link that does the right thing for either kind of destination.
 *
 * Merchant-picked links (a section's "view all", a banner, a hero CTA) resolve
 * server-side to a plain href which may be an in-app path OR an absolute URL —
 * the admin's link picker offers "رابط خارجي". A bare react-router `<Link to>`
 * turns an absolute URL into a same-origin navigation to `/https://…`, which
 * 404s; this picks the right element and adds the rel guard for external ones.
 */
export function SmartLink({ href, className, children }: SmartLinkProps) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

export default SmartLink;
