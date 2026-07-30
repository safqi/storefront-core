import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchProduct, queryKeys } from "../lib/api";
import { formatMoney } from "../lib/format";
import { t } from "../lib/i18n";
import { cfg, str } from "./config";

/** First ~140 characters of a product description, tags stripped. */
function excerpt(html: string): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

/**
 * One hand-picked product, rendered large.
 *
 * The merchant stores only the product SLUG, so the card always shows current
 * price and stock rather than a snapshot frozen when they built the page. A
 * product that is later unpublished simply makes the section disappear, which
 * is the right failure: a homepage block linking to a 404 is worse than none.
 */
export function FeaturedProductSection({ section }: { section: AppHomepageSection }) {
  const c = section.config;
  const slug = str(c, "product");

  const { data: product, isLoading } = useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: () => fetchProduct(slug),
    enabled: Boolean(slug),
  });

  if (!slug) return null;

  if (isLoading) {
    return (
      <section className="sf-section sf-featured">
        <div className="sf-skeleton h-64 w-full rounded-3xl" />
      </section>
    );
  }

  if (!product) return null;

  const heading = str(c, "heading");
  const ctaLabel = str(c, "cta_label") || t("home.viewProduct");
  const image = product.images?.[0]?.url ?? "";
  const price = product.sale_price ?? product.price;
  const hasDiscount = Boolean(product.sale_price && product.sale_price !== product.price);

  return (
    <section className="sf-section sf-featured">
      {heading ? <h2 className="sf-section__title">{heading}</h2> : null}

      <div className="sf-featured__card">
        <Link to={`/products/${product.slug}`} className="sf-featured__media">
          {image ? (
            <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </Link>

        <div className="sf-featured__body">
          <Link to={`/products/${product.slug}`} className="sf-featured__name">
            {product.name}
          </Link>

          {/* The detail resource ships full HTML in `description`; strip the
              tags rather than injecting them — a homepage excerpt is not the
              place to render merchant markup. */}
          {product.description ? (
            <p className="sf-featured__excerpt">{excerpt(product.description)}</p>
          ) : null}

          {cfg<boolean>(c, "show_price", true) && price != null && (
            <div className="sf-featured__price">
              <span className="sf-price">{formatMoney(price)}</span>
              {hasDiscount && <span className="sf-price--was">{formatMoney(product.price)}</span>}
            </div>
          )}

          <Link to={`/products/${product.slug}`} className="sf-btn sf-btn--primary inline-flex">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FeaturedProductSection;
