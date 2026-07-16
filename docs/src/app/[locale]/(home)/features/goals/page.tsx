import { createOGImageUrl } from "@/lib/metadata";
import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";
import {
  capabilities,
  faqItems,
  howItWorks,
  relatedFeatures,
  whoUses,
} from "./feature-data";

export const metadata: Metadata = {
  title: "Goals - Rybbit | Conversion Goal Tracking",
  description:
    "Set conversion goals and track them automatically. Path-based or event-based goals with property conditions, unlimited goals, and real-time completion data.",
  openGraph: {
    title: "Goals - Rybbit",
    description:
      "Set conversion goals and track completions in real time. Path or event-based, with property conditions.",
    type: "website",
    url: "https://rybbit.com/features/goals",
    images: [
      createOGImageUrl(
        "Conversion Goals",
        "Set conversion goals and track completions in real time.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Goals - Rybbit",
    description:
      "Set conversion goals and track completions in real time.",
    images: [
      createOGImageUrl(
        "Conversion Goals",
        "Set conversion goals and track completions in real time.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/goals",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/goals",
      name: "Rybbit Goals",
      description: "Conversion goal tracking for websites and products.",
      url: "https://rybbit.com/features/goals",
      isPartOf: {
        "@type": "WebSite",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((faq) => ({
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

export default function GoalsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="goals"
        headline="Track what matters most"
        subtitle="Define conversion goals with page paths or custom events. See real-time completion counts and rates without any complex setup."
        badgeText="Goals"
        demoUrl="https://demo.rybbit.com/81/goals"
        demoCaption="Live goals demo — real conversion tracking data"
        introParagraphs={[
          <>
            Every website has a purpose — a signup, a purchase, a download, a contact form submission. <strong className="text-neutral-900 dark:text-white">Goals let you track these conversions</strong> with a single click. No tag managers, no conversion pixels, no third-party scripts. Just define what success looks like and Rybbit does the rest.
          </>,
          <>
            Create <strong className="text-neutral-900 dark:text-white">path-based goals</strong> that trigger when users visit specific URLs, or <strong className="text-neutral-900 dark:text-white">event-based goals</strong> that trigger on custom events with specific property values. Track purchases only when the plan is &ldquo;enterprise,&rdquo; or count signups only from a specific landing page.
          </>,
          <>
            Goals work seamlessly with the rest of Rybbit&apos;s toolset. Filter your goals by any dimension — traffic source, country, device — to understand <strong className="text-neutral-900 dark:text-white">which segments convert best</strong>. Pair with funnels to see the path to conversion, and session replay to watch what happens when users <em>don&apos;t</em> convert.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Start tracking conversions"
        ctaDescription="Simple goal tracking with real-time data. Define what success looks like and measure it."
      />
    </>
  );
}
