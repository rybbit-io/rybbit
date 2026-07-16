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
  title: "User Profiles - Rybbit | User Identification & Traits",
  description:
    "Identify users, track custom traits, and view complete activity timelines. Privacy-first user profiles with anonymous-to-identified linking and full session history.",
  openGraph: {
    title: "User Profiles - Rybbit",
    description:
      "Identify users, track traits, and see their complete activity history. Privacy-first user profiles.",
    type: "website",
    url: "https://rybbit.com/features/user-profiles",
    images: [
      createOGImageUrl(
        "User Profiles",
        "Identify users, track traits, and see their complete activity history.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "User Profiles - Rybbit",
    description:
      "Identify users, track traits, and see their complete activity history. Privacy-first.",
    images: [
      createOGImageUrl(
        "User Profiles",
        "Identify users, track traits, and see their complete activity history.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/user-profiles",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/user-profiles",
      name: "Rybbit User Profiles",
      description:
        "Privacy-first user identification and profile management.",
      url: "https://rybbit.com/features/user-profiles",
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

export default function UserProfilesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="user-profiles"
        headline="Know who your users are"
        subtitle="Identify users, attach custom traits, and view their complete activity history — from first visit to latest session. Privacy-first, always opt-in."
        badgeText="User Profiles"
        demoUrl="https://demo.rybbit.com/81/users"
        demoCaption="Live user profiles demo — real user data and traits"
        introParagraphs={[
          <>
            Aggregate analytics tell you what&apos;s happening across your site. User profiles tell you <strong className="text-neutral-900 dark:text-white">who is doing what</strong>. When a customer reaches out for support, you can pull up their profile and see every page they visited, every event they triggered, and every session they had — no questions needed.
          </>,
          <>
            Identification is <strong className="text-neutral-900 dark:text-white">completely opt-in and privacy-first</strong>. Users are only identified when you explicitly call <code className="bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm">rybbit.identify()</code>. There&apos;s no fingerprinting, no cross-site tracking, and no passive data collection. You decide exactly what information to attach — plan type, company, role, or any custom trait.
          </>,
          <>
            The <strong className="text-neutral-900 dark:text-white">Traits explorer</strong> lets you browse the distribution of user properties across your entire user base. How many users are on the free plan vs. pro? Which companies have the most active users? Combined with session replay and event tracking, user profiles give your team <strong className="text-neutral-900 dark:text-white">complete visibility</strong> into individual user behavior without compromising privacy.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Understand your users deeply"
        ctaDescription="Privacy-first user profiles with traits, timelines, and session history. You control the data."
      />
    </>
  );
}
