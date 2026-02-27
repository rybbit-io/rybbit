import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - Analytics You'll Actually Use",
  description:
    "See where visitors come from, watch what they do, and find exactly where you lose them — in one dashboard. 5 minutes to set up, 1 line of code, no cookie banners.",
  openGraph: {
    images: [createOGImageUrl("Make the hop to analytics you'll actually use.", "See where visitors come from, watch what they do, and find exactly where you lose them — in one dashboard.")],
  },
  twitter: {
    images: [createOGImageUrl("Make the hop to analytics you'll actually use.", "See where visitors come from, watch what they do, and find exactly where you lose them — in one dashboard.")],
  },
});

export default function LandingPage5() {
  return (
    <LandingPageTemplate
      title="Make the hop 🐸 to analytics you'll actually use."
      subtitle="See where visitors come from, watch what they do, and find exactly where you lose them — in one dashboard. 5 minutes to set up, 1 line of code, no cookie banners."
      showEUFlag={false}
    />
  );
}
