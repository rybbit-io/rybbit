import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { useExtracted } from "next-intl";

export const metadata = createMetadata({
  title: "Rybbit - Cookieless Google Analytics Replacement",
  description:
    "Open source, cookieless web & product analytics with an 18 KB script and one readable dashboard. GDPR/CCPA compliant, no cookie banner needed.",
  openGraph: {
    images: [
      createOGImageUrl(
        "Rybbit - Cookieless Google Analytics Replacement",
        "Open source, cookieless web & product analytics with an 18 KB script and one readable dashboard. GDPR/CCPA compliant, no cookie banner needed."
      ),
    ],
  },
  twitter: {
    images: [
      createOGImageUrl(
        "Rybbit - Cookieless Google Analytics Replacement",
        "Open source, cookieless web & product analytics with an 18 KB script and one readable dashboard. GDPR/CCPA compliant, no cookie banner needed."
      ),
    ],
  },
});

export default function HomePage() {
  const t = useExtracted();

  return (
    <LandingPageTemplate
      title={t("The Modern Google Analytics Replacement")}
      subtitle={t(
        "Rybbit is open-source, cookieless analytics: one readable dashboard and an 18 KB script. No consent banner needed, GDPR and CCPA compliant."
      )}
      showEUFlag
    />
  );
}
