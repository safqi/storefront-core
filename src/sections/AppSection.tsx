import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { SmartLink } from "../components/SmartLink";
import { getAppApiUrl, isAppInstalled } from "../lib/appConfig";
import { str } from "./config";

/**
 * A homepage block contributed by an installed app.
 *
 * Apps ship NO storefront JavaScript. One declares a section in its manifest,
 * the merchant adds it in the theme builder, and at render time this fetches
 * the app's normalised payload and draws it with the shared `.sf-*` card
 * classes — so a single app implementation looks native in every theme,
 * in-repo and marketplace alike, and a new theme needs no per-app work.
 *
 * The section type is `app:{slug}:{key}`.
 */

export interface AppSectionItem {
  image: string | null;
  title: string;
  subtitle: string | null;
  badge: string | null;
  link: string | null;
}

export interface AppSectionPayload {
  title: string | null;
  layout: "swipe" | "grid" | "list";
  items: AppSectionItem[];
}

/** Split `app:{slug}:{key}` into its parts, or null when the type isn't one. */
export function parseAppSectionType(type: string): { slug: string; key: string } | null {
  if (!type.startsWith("app:")) return null;

  const [, slug, ...rest] = type.split(":");
  const key = rest.join(":");

  return slug && key ? { slug, key } : null;
}

async function fetchAppSection(slug: string, key: string): Promise<AppSectionPayload> {
  const { data } = await axios.get(getAppApiUrl(slug, `sections/${encodeURIComponent(key)}`));
  return {
    title: data?.title ?? null,
    layout: data?.layout ?? "grid",
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

function Card({ item }: { item: AppSectionItem }) {
  const body = (
    <div className="sf-app-section__card">
      {item.image ? (
        <img src={item.image} alt="" loading="lazy" className="sf-app-section__image" />
      ) : null}
      <div className="sf-app-section__body">
        {item.badge ? <span className="sf-app-section__badge">{item.badge}</span> : null}
        <span className="sf-app-section__title">{item.title}</span>
        {item.subtitle ? <span className="sf-app-section__subtitle">{item.subtitle}</span> : null}
      </div>
    </div>
  );

  return item.link ? (
    <SmartLink href={item.link} className="block">
      {body}
    </SmartLink>
  ) : (
    body
  );
}

export function AppSection({ section }: { section: AppHomepageSection }) {
  const parsed = parseAppSectionType(section.type);
  const slug = parsed?.slug ?? "";
  const key = parsed?.key ?? "";

  // Never fire a request for an app this tenant doesn't have: the endpoint is
  // 404-gated server-side, and a guaranteed-failing request on every homepage
  // load is pure noise in the console and the logs.
  const enabled = Boolean(parsed) && isAppInstalled(slug);

  const { data } = useQuery({
    queryKey: ["app-section", slug, key],
    queryFn: () => fetchAppSection(slug, key),
    enabled,
  });

  if (!parsed || !data || data.items.length === 0) return null;

  // The merchant's own heading wins over the app's; either may be absent.
  const heading = str(section.config, "heading") || data.title || "";
  const swipe = data.layout === "swipe";

  const cards = data.items.map((item, i) => <Card key={i} item={item} />);

  return (
    <section className="sf-section sf-app-section">
      {heading ? <h2 className="sf-section__title">{heading}</h2> : null}

      {swipe ? (
        <div className="sf-swipe-row sf-no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {cards.map((card, i) => (
            <div key={i} className="w-40 flex-shrink-0 sm:w-48">
              {card}
            </div>
          ))}
        </div>
      ) : (
        <div className={data.layout === "list" ? "flex flex-col gap-2" : "grid grid-cols-2 gap-3 md:grid-cols-4"}>
          {cards}
        </div>
      )}
    </section>
  );
}

export default AppSection;
