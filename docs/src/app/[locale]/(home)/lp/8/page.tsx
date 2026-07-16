import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - See Your Website the Way Your Customers Do",
  description:
    "Real-time traffic, session replay, and conversion funnels in one place — so you always know what's working and what isn't. Set up in 5 minutes, no tech skills needed, no cookie banners, no compromise.",
  openGraph: {
    images: [createOGImageUrl("See your website the way your customers do.", "Real-time traffic, session replay, and conversion funnels in one place — so you always know what's working and what isn't.")],
  },
  twitter: {
    images: [createOGImageUrl("See your website the way your customers do.", "Real-time traffic, session replay, and conversion funnels in one place — so you always know what's working and what isn't.")],
  },
});

export default function LandingPage8() {
  return (
    <LandingPageTemplate
      title="See your website the way your customers do."
      subtitle="Real-time traffic, session replay, and conversion funnels in one place — so you always know what's working and what isn't. Set up in 5 minutes, no tech skills needed, no cookie banners, no compromise."
      showEUFlag={false}
    />
  );
}
