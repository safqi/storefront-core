import type { ComponentType } from "react";
import {
  CountdownOfferSection,
  DividerSection,
  FaqSection,
  FeaturesStripSection,
  ImageTextSection,
  MarqueeSection,
  NewsletterSection,
  RichTextSection,
  TestimonialsSection,
  VideoSection,
} from "./ContentSections";
import { FeaturedProductSection } from "./FeaturedProductSection";
import { AppSection, parseAppSectionType } from "./AppSection";

type SectionComponent = ComponentType<{ section: AppHomepageSection }>;

/**
 * Section types the core renders on every theme's behalf.
 *
 * A map rather than a switch so `CORE_SECTION_TYPES` is derived from it — the
 * list a theme's manifest test validates against can then never drift from what
 * actually renders.
 */
export const CORE_SECTIONS: Record<string, SectionComponent> = {
  rich_text: RichTextSection,
  image_text: ImageTextSection,
  video: VideoSection,
  faq: FaqSection,
  divider: DividerSection,
  features_strip: FeaturesStripSection,
  testimonials: TestimonialsSection,
  featured_product: FeaturedProductSection,
  countdown_offer: CountdownOfferSection,
  newsletter: NewsletterSection,
  marquee: MarqueeSection,
};

/** Every type CoreSectionRenderer can render. */
export const CORE_SECTION_TYPES = Object.keys(CORE_SECTIONS);

/**
 * Fallback renderer for every section type a theme does not implement itself.
 *
 * A theme's own `SectionRenderer` handles the types it wants to style bespoke
 * (hero, product grids, category strips …) and delegates its `default:` arm
 * here. That is what lets a new section type ship ONCE — declared in the
 * backend catalog, rendered here — instead of being copy-pasted into every
 * theme, in-repo and marketplace alike.
 *
 * Unknown types still render nothing: an older theme paired with a newer
 * backend must degrade quietly, never crash the homepage.
 */
export function CoreSectionRenderer({ section }: { section: AppHomepageSection }) {
  // App-contributed sections are typed `app:{slug}:{key}` — one renderer for
  // all of them, since the payload shape is the platform's contract.
  if (parseAppSectionType(section.type)) {
    return <AppSection section={section} />;
  }

  const Component = CORE_SECTIONS[section.type];

  return Component ? <Component section={section} /> : null;
}

export default CoreSectionRenderer;
