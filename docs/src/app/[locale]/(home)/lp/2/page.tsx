import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - Analytics Made Simple",
  description:
    "Know where your visitors come from, see what they do, and find exactly where you lose them — all in one dashboard. 5 minutes to set up, 1 line of code, no cookie banners.",
  openGraph: {
    images: [createOGImageUrl("Analytics made simple.", "Know where your visitors come from, see what they do, and find exactly where you lose them — all in one dashboard.")],
  },
  twitter: {
    images: [createOGImageUrl("Analytics made simple.", "Know where your visitors come from, see what they do, and find exactly where you lose them — all in one dashboard.")],
  },
});

export default function LandingPage2() {
  return (
    <LandingPageTemplate
      title="Analytics made simple."
      subtitle="Know where your visitors come from, see what they do, and find exactly where you lose them — all in one dashboard. 5 minutes to set up, 1 line of code, no cookie banners. Finally, clarity."
      showEUFlag={false}
    />
  );
}
