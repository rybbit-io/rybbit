import { LandingB } from "@/components/lp-b/LandingB";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

const TITLE = "Rybbit - Cookieless Google Analytics Replacement";
const DESCRIPTION =
  "Open source, cookieless web & product analytics with an 18 KB script and one readable dashboard. GDPR/CCPA compliant, no cookie banner needed.";

/**
 * Homepage redesign, variant B. Served at `/` for the visitors `proxy.ts`
 * enrolls in the B arm (the URL stays `/`); reachable here directly for
 * review. Canonical points at the homepage so the two never compete.
 */
export const metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { images: [createOGImageUrl(TITLE, DESCRIPTION)] },
  twitter: { images: [createOGImageUrl(TITLE, DESCRIPTION)] },
});

export default function HomeVariantBPage() {
  return <LandingB />;
}
