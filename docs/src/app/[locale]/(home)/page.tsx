import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { useExtracted } from "next-intl";

export const metadata = createMetadata({
  title: "Rybbit - Cookieless Google Analytics Replacement",
  description:
    "Next-gen, open source, lightweight, cookieless web & product analytics for everyone — GDPR/CCPA compliant.",
  openGraph: {
    images: [createOGImageUrl("Rybbit - Cookieless Google Analytics Replacement", "Next-gen, open source, lightweight, cookieless web & product analytics for everyone — GDPR/CCPA compliant.")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit - Cookieless Google Analytics Replacement", "Next-gen, open source, lightweight, cookieless web & product analytics for everyone — GDPR/CCPA compliant.")],
  },
});

export default function HomePage() {
  const t = useExtracted();

  return (
    <LandingPageTemplate
      title={t("The Modern Google Analytics Replacement")}
      subtitle={t("Rybbit is powerful, lightweight, and super easy to use analytics. Cookieless and GDPR compliant. Hosted on EU infrastructure in Germany")}
      showEUFlag
    />
  );
}
