import { AnimatedWords } from "@/components/AnimatedWords";
import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - Simple Analytics for Your Business",
  description:
    "See where your visitors come from, watch what they do, and find exactly where you lose them — in one beautiful dashboard. 5 minutes to set up, no cookie banners, no complexity.",
  openGraph: {
    images: [createOGImageUrl("Simple analytics for your business.", "See where your visitors come from, watch what they do, and find exactly where you lose them — in one beautiful dashboard.")],
  },
  twitter: {
    images: [createOGImageUrl("Simple analytics for your business.", "See where your visitors come from, watch what they do, and find exactly where you lose them — in one beautiful dashboard.")],
  },
});

export default function LandingPage4() {
  return (
    <LandingPageTemplate
      title={
        <>
          Simple analytics for your <AnimatedWords />
        </>
      }
      subtitle="See where your visitors come from, watch what they do, and find exactly where you lose them — in one beautiful dashboard. 5 minutes to set up, no cookie banners, no complexity."
      showEUFlag={false}
    />
  );
}
