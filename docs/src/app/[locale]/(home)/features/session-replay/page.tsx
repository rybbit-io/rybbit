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
  title: "Session Replay - Rybbit | Watch Real User Sessions",
  description:
    "See exactly what your users do. Privacy-first session replay with automatic input masking, zero performance impact, and full integration with your analytics.",
  openGraph: {
    title: "Session Replay - Rybbit",
    description:
      "See exactly what your users do. Privacy-first session replay built into your analytics.",
    type: "website",
    url: "https://rybbit.com/features/session-replay",
    images: [
      createOGImageUrl(
        "Session Replay",
        "See exactly what your users do. Privacy-first session replay built into your analytics.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Session Replay - Rybbit",
    description:
      "See exactly what your users do. Privacy-first session replay built into your analytics.",
    images: [
      createOGImageUrl(
        "Session Replay",
        "See exactly what your users do. Privacy-first session replay built into your analytics.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/session-replay",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/session-replay",
      name: "Rybbit Session Replay",
      description:
        "Watch real user sessions to understand behavior and debug issues.",
      url: "https://rybbit.com/features/session-replay",
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

export default function SessionReplayPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="session-replay"
        headline="See exactly what your users did"
        subtitle="Watch real user sessions to spot usability issues, debug problems, and understand behavior — without compromising privacy."
        badgeText="Session Replay"
        demoUrl="https://demo.rybbit.com/81/replay"
        demoCaption="Live session replay demo — watch real user sessions"
        introParagraphs={[
          <>
            Numbers tell you <em>what</em> happened. Session replay shows you <strong className="text-neutral-900 dark:text-white">why</strong>. When your conversion rate drops, you don&apos;t need to guess — just watch the sessions where users abandoned your funnel and see the exact moment they got confused, frustrated, or lost.
          </>,
          <>
            Unlike standalone tools like Hotjar or FullStory, Rybbit&apos;s session replay is <strong className="text-neutral-900 dark:text-white">built directly into your analytics platform</strong>. There&apos;s no separate tool to manage, no additional billing, and no data silos. Filter your analytics by any dimension, then watch the matching sessions. It&apos;s that simple.
          </>,
          <>
            Privacy is a first-class concern. Sensitive form inputs are <strong className="text-neutral-900 dark:text-white">automatically masked</strong>, the capture script loads asynchronously with <strong className="text-neutral-900 dark:text-white">zero performance impact</strong>, and because Rybbit is open source, you can self-host everything and keep full control over your data. No third-party ever touches your replays.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="See what your users see"
        ctaDescription="Privacy-first session replay integrated into your analytics. No separate tool required."
      />
    </>
  );
}
