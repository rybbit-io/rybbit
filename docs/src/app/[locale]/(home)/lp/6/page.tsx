import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - Watch Your Visitors. Make More Money.",
  description:
    "The simple analytics tool that shows you where visitors come from, what they do, and exactly where you lose them — in one dashboard. 5 minutes to set up, 1 line of code, no cookie banners.",
  openGraph: {
    images: [createOGImageUrl("Watch your visitors. Make more money.", "The simple analytics tool that shows you where visitors come from, what they do, and exactly where you lose them.")],
  },
  twitter: {
    images: [createOGImageUrl("Watch your visitors. Make more money.", "The simple analytics tool that shows you where visitors come from, what they do, and exactly where you lose them.")],
  },
});

export default function LandingPage6() {
  return (
    <LandingPageTemplate
      title="Watch your visitors. Make more money."
      subtitle="The simple analytics tool that shows you where visitors come from, what they do, and exactly where you lose them — in one dashboard. 5 minutes to set up, 1 line of code, no cookie banners."
      showEUFlag={false}
    />
  );
}
