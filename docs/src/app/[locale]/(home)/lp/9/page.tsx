import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - The Analytics You'll Actually Open Every Morning",
  description:
    "Finally understand who visits your site, what they do, and why they leave without buying — in a dashboard so simple it replaces your morning guesswork with clarity. Live in 5 minutes, 1 line of code.",
  openGraph: {
    images: [createOGImageUrl("The analytics you'll actually open every morning.", "Finally understand who visits your site, what they do, and why they leave without buying.")],
  },
  twitter: {
    images: [createOGImageUrl("The analytics you'll actually open every morning.", "Finally understand who visits your site, what they do, and why they leave without buying.")],
  },
});

export default function LandingPage9() {
  return (
    <LandingPageTemplate
      title="The analytics you'll actually open every morning."
      subtitle="Finally understand who visits your site, what they do, and why they leave without buying — in a dashboard so simple it replaces your morning guesswork with clarity. Live in 5 minutes, 1 line of code."
      showEUFlag={false}
    />
  );
}
