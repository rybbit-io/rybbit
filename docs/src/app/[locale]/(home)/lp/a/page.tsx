import { VariantA } from "@/components/lp-variants/VariantA";
import { LP_META_DESCRIPTION, LP_TITLE } from "@/components/lp-variants/shared";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

/**
 * Redesign candidate A — no frame; centered column, whitespace does the separating.
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

export default function LandingVariantA() {
  return <VariantA />;
}
