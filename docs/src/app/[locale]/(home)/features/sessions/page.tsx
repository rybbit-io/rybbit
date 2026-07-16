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
  title: "Sessions - Rybbit | Individual Session Browser",
  description:
    "Browse individual user sessions with rich metadata, event timelines, and click-to-filter exploration. See exactly what each visitor did on your site.",
  openGraph: {
    title: "Sessions - Rybbit",
    description:
      "Browse individual user sessions with metadata, event timelines, and one-click filtering.",
    type: "website",
    url: "https://rybbit.com/features/sessions",
    images: [
      createOGImageUrl(
        "Sessions",
        "Browse individual user sessions with metadata, event timelines, and one-click filtering.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sessions - Rybbit",
    description:
      "Browse individual user sessions with metadata, event timelines, and one-click filtering.",
    images: [
      createOGImageUrl(
        "Sessions",
        "Browse individual user sessions with metadata, event timelines, and one-click filtering.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/sessions",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/sessions",
      name: "Rybbit Sessions",
      description:
        "Browse and analyze individual user sessions with full metadata and event timelines.",
      url: "https://rybbit.com/features/sessions",
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

export default function SessionsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="sessions"
        headline="Every session, fully inspectable"
        subtitle="Browse individual user sessions with rich metadata cards, expandable event timelines, and click-to-filter exploration. The analytical layer behind session replay."
        badgeText="Sessions"
        demoUrl="https://demo.rybbit.com/81/sessions"
        demoCaption="Live sessions demo — browse real user sessions with full metadata"
        introParagraphs={[
          <>
            Aggregate analytics show you the big picture. But sometimes you need to zoom in on <strong className="text-neutral-900 dark:text-white">individual sessions</strong> — to investigate a support ticket, understand a power user&apos;s behavior, or see what users from a specific campaign actually did after landing on your site.
          </>,
          <>
            The Sessions page gives you a <strong className="text-neutral-900 dark:text-white">paginated, filterable list of every session</strong> with rich metadata cards. Each card shows the user, country, device, browser, entry and exit pages, duration, and event counts. Click any attribute — a country flag, a browser icon, a page path — to instantly filter down to matching sessions. Toggle <strong className="text-neutral-900 dark:text-white">&ldquo;Identified only&rdquo;</strong> to focus on known users, or set minimum thresholds for pageviews, events, and duration to surface the most engaged sessions.
          </>,
          <>
            Expand any session to reveal its <strong className="text-neutral-900 dark:text-white">complete event timeline</strong> — every pageview, custom event, button click, form submission, and outbound link in chronological order. When you need even more context, sessions with replay data let you <strong className="text-neutral-900 dark:text-white">jump straight into the visual recording</strong> with one click. It&apos;s the structured, queryable complement to session replay — the spreadsheet view next to the video view.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="See every session in detail"
        ctaDescription="Browse, filter, and inspect individual user sessions. Full event timelines, zero setup."
      />
    </>
  );
}
