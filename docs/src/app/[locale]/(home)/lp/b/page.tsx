import { VariantB } from "@/components/lp-variants/VariantB";
import { LP_META_DESCRIPTION, LP_TITLE } from "@/components/lp-variants/shared";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

/**
 * Redesign candidate B — one live dashboard, switched between real views, instead of a feature mosaic.
 *
 * Temporary preview path. `lp/layout.tsx` marks everything under /lp as
 * `robots: noindex, follow`, so these do not compete with the homepage while
 * they are being polished. Intended end state is an A/B test against `/`.
 */
export const metadata = createMetadata({
  title: "Rybbit - Cookieless Google Analytics Replacement",
  description: LP_META_DESCRIPTION,
  openGraph: { images: [createOGImageUrl(LP_TITLE, LP_META_DESCRIPTION)] },
  twitter: { images: [createOGImageUrl(LP_TITLE, LP_META_DESCRIPTION)] },
});

export default function LandingVariantB() {
  return <VariantB />;
}
