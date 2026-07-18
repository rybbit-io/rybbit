import { createOGImageUrl } from "@/lib/metadata";
import type { Metadata } from "next";
import { FeaturePage } from "../features/components/FeaturePage";
import { capabilities, faqItems, howItWorks, relatedFeatures, whoUses } from "./persona-data";

export const metadata: Metadata = {
  title: "Web Analytics for Agencies - Rybbit | Client Dashboards & Multi-Site Reporting",
  description:
    "Manage every client site in one workspace. Share live dashboards without logins, embed reports in your portal, import history from other tools, and skip the cookie banners.",
  openGraph: {
    title: "Rybbit for Agencies",
    description:
      "Every client site in one workspace. Live dashboards you can hand to anyone — no logins, no cookie banners.",
    type: "website",
    url: "https://rybbit.com/for-agencies",
    images: [
      createOGImageUrl(
        "Rybbit for Agencies",
        "Every client site in one workspace. Live dashboards you can hand to anyone.",
        "For Agencies"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Analytics for Agencies - Rybbit",
    description:
      "Every client site in one workspace. Live dashboards you can hand to anyone — no logins, no cookie banners.",
    images: [
      createOGImageUrl(
        "Rybbit for Agencies",
        "Every client site in one workspace. Live dashboards you can hand to anyone.",
        "For Agencies"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/for-agencies",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/for-agencies",
      name: "Rybbit for Agencies",
      description:
        "Web analytics for agencies and freelancers: client dashboards without logins, multi-site management, and cookieless compliance.",
      url: "https://rybbit.com/for-agencies",
      isPartOf: {
        "@type": "WebSite",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

export default function ForAgenciesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <FeaturePage
        featureName="for-agencies"
        displayTitle="Client reporting, minus the busywork"
        headline="Analytics your clients will actually read"
        subtitle="Run every client site from one workspace. Share live dashboards without logins, send reports that explain themselves, and never install another cookie banner."
        badgeText="Rybbit for Agencies"
        demoUrl="https://demo.rybbit.com/81/main"
        demoCaption="A live, client-ready dashboard — this is exactly what you'd share."
        introParagraphs={[
          <>
            Client reporting shouldn&apos;t mean screenshotting GA4 into a slide deck. Clients don&apos;t log into
            Google Analytics — and when they do, they leave more confused than they arrived. So agencies burn
            billable hours every month turning exports into something a client can read.
          </>,
          <>
            Rybbit flips that workflow. All your client sites live in{" "}
            <strong className="text-neutral-900 dark:text-white">one organization</strong>, and every dashboard is
            presentable enough to hand over as-is: share a{" "}
            <strong className="text-neutral-900 dark:text-white">private read-only link</strong>{" "}
            with no login required, embed it in your client portal, or make it public. Moving a client from another tool? Import
            their history so day one doesn&apos;t look like an empty chart.
          </>,
          <>
            And because Rybbit is <strong className="text-neutral-900 dark:text-white">cookieless</strong>{" "}
            and GDPR/CCPA-friendly, analytics stops being the reason your clients&apos; sites need a consent banner. You
            get to be the agency that removed it.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Be the agency with better answers"
        ctaDescription="One workspace for every client site. Dashboards you can hand to anyone. Start free and see it with your own data."
      />
    </>
  );
}
