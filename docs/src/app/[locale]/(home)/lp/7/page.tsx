import { LandingPageTemplate } from "@/components/LandingPageTemplate";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Rybbit - Your Website Has the Answers. We Help You Find Them.",
  description:
    "Watch real visitor sessions, track your conversion funnel, and discover what's costing you money — without the complexity. Set up in 5 minutes, no developers needed, GDPR compliant out of the box.",
  openGraph: {
    images: [createOGImageUrl("Your website has the answers. We help you find them.", "Watch real visitor sessions, track your conversion funnel, and discover what's costing you money.")],
  },
  twitter: {
    images: [createOGImageUrl("Your website has the answers. We help you find them.", "Watch real visitor sessions, track your conversion funnel, and discover what's costing you money.")],
  },
});

export default function LandingPage7() {
  return (
    <LandingPageTemplate
      title="Your website has the answers. We help you find them."
      subtitle="Watch real visitor sessions, track your conversion funnel, and discover what's costing you money — without the complexity. Set up in 5 minutes, no developers needed, GDPR compliant out of the box."
      showEUFlag={false}
    />
  );
}
