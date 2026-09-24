import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { CoreWebVitalsCheckerForm } from "./CoreWebVitalsCheckerForm";

const canonicalUrl = "https://rybbit.com/tools/core-web-vitals-checker";
const description =
  "Check Core Web Vitals with PageSpeed Insights. Compare real-user field data and Lighthouse lab metrics for any public mobile or desktop page in seconds.";

export const metadata: Metadata = {
  title: "Free Core Web Vitals Checker | Rybbit",
  description,
  alternates: { canonical: canonicalUrl },
  openGraph: { title: "Free Core Web Vitals Checker", description, type: "website", url: canonicalUrl },
  twitter: { card: "summary_large_image", title: "Free Core Web Vitals Checker", description },
};

const faqs = [
  {
    question: "What are the three Core Web Vitals?",
    answer:
      "Largest Contentful Paint (LCP) measures loading, Interaction to Next Paint (INP) measures responsiveness, and Cumulative Layout Shift (CLS) measures visual stability. Google evaluates field results at the 75th percentile.",
  },
  {
    question: "What counts as a good Core Web Vitals result?",
    answer:
      "Current good thresholds are LCP at 2.5 seconds or less, INP at 200 milliseconds or less, and CLS at 0.1 or less. A page passes the field assessment when all three Core Web Vitals are available and in the good range.",
  },
  {
    question: "Why is field data unavailable for my URL?",
    answer:
      "Chrome User Experience Report data appears only when a public URL or origin has enough representative, anonymized traffic. New or lower-traffic pages may have no field metrics even though Lighthouse can run a lab test.",
  },
  {
    question: "Why do field and lab results differ?",
    answer:
      "Field data summarizes many real visits across devices, networks, and locations. Lighthouse is one simulated load in a controlled environment. Use field data to identify real-user outcomes and lab diagnostics to investigate likely causes.",
  },
  {
    question: "Does Rybbit measure real-user web performance?",
    answer:
      "Rybbit focuses on privacy-friendly website and product analytics. Use this checker for an on-demand PageSpeed snapshot, then monitor your own releases and traffic patterns to connect performance changes with user behavior.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Core Web Vitals Checker",
      description,
      url: canonicalUrl,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      creator: { "@type": "Organization", name: "Rybbit", url: "https://rybbit.com" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

const educationalContent = (
  <>
    <section>
      <h2>What Core Web Vitals measure</h2>
      <p>
        Core Web Vitals focus on three parts of a page experience. Largest Contentful Paint measures when the main
        content becomes visible. Interaction to Next Paint measures how quickly the page responds to clicks, taps, and
        keyboard input. Cumulative Layout Shift measures unexpected visual movement.
      </p>
      <p>
        Google&apos;s current good boundaries are 2.5 seconds for LCP, 200 milliseconds for INP, and 0.1 for CLS. Field
        assessment uses the 75th percentile, so the target reflects what most visits experience rather than a fast
        median.
      </p>
    </section>

    <section>
      <h2>Field data and lab data answer different questions</h2>
      <p>
        Field metrics come from the Chrome User Experience Report and summarize eligible real visits over time. They
        show whether actual users are receiving a good experience, but require enough public traffic to protect privacy
        and produce a representative sample.
      </p>
      <p>
        Lighthouse lab data is generated from one controlled test. It is repeatable enough for diagnostics and can
        surface render-blocking work, slow server responses, or large resources. It cannot produce a realistic INP
        without representative user interactions, so field data remains the stronger source for responsiveness.
      </p>
    </section>

    <section>
      <h2>How to improve a failing result</h2>
      <p>
        For LCP, start with server response time, the priority of the main image or text resource, and render-blocking
        CSS or JavaScript. For INP, find long main-thread tasks and break work into smaller units so the browser can
        paint promptly after input. For CLS, reserve space for images, embeds, ads, and late-loading interface elements.
      </p>
      <p>
        Test both mobile and desktop after meaningful releases, but avoid optimizing a single Lighthouse score in
        isolation. The durable goal is a consistently good experience across real devices, networks, routes, and user
        journeys.
      </p>
    </section>
  </>
);

export default function CoreWebVitalsCheckerPage() {
  return (
    <ToolPageLayout
      toolSlug="core-web-vitals-checker"
      title="Core Web Vitals Checker"
      description="Run an official PageSpeed Insights test and compare real-user field data with Lighthouse lab diagnostics."
      toolComponent={<CoreWebVitalsCheckerForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="seo"
      ctaTitle="Measure what happens after the page loads"
      ctaDescription="Pair performance checks with privacy-friendly analytics to understand how real visitors navigate, convert, and return."
      ctaEventLocation="core_web_vitals_checker_cta"
      structuredData={structuredData}
    />
  );
}
