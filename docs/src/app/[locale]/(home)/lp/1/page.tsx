import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - Simple Analytics You'll Actually Use",
  description:
    "See where your visitors come from, watch what they do, and find exactly where you lose them — in one dashboard that takes 5 minutes to set up.",
  openGraph: {
    images: [createOGImageUrl("Simple analytics you wish you had before.", "See where your visitors come from, watch what they do, and find exactly where you lose them — in one dashboard that takes 5 minutes to set up.")],
  },
  twitter: {
    images: [createOGImageUrl("Simple analytics you wish you had before.", "See where your visitors come from, watch what they do, and find exactly where you lose them — in one dashboard that takes 5 minutes to set up.")],
  },
});

export default function LandingPage1() {
  return (
    <LandingPageTemplate
      title="Simple analytics you wish you had before."
      subtitle="See where your visitors come from, watch what they do, and find exactly where you lose them — in one dashboard that takes 5 minutes to set up. No developers, no cookie banners, no guesswork. Just clarity."
      showEUFlag={false}
    />
  );
}
