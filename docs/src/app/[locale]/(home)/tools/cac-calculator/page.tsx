import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { CACCalculatorForm } from "./CACCalculatorForm";

export const metadata: Metadata = {
  title: "Free CAC Calculator | Customer Acquisition Cost",
  description:
    "Calculate customer acquisition cost from marketing, sales, agency, software, and other costs. See blended CAC and a detailed cost breakdown by period.",
  openGraph: {
    title: "Free CAC Calculator | Customer Acquisition Cost",
    description: "Calculate blended customer acquisition cost and review the costs behind it.",
    type: "website",
    url: "https://rybbit.com/tools/cac-calculator",
    siteName: "Rybbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free CAC Calculator | Customer Acquisition Cost",
    description: "Calculate CAC from marketing, sales, tools, agency, and other acquisition costs.",
  },
  alternates: { canonical: "https://rybbit.com/tools/cac-calculator" },
};

const faqs = [
  {
    question: "How do I calculate customer acquisition cost?",
    answer:
      "Add the sales and marketing costs used to acquire customers during a period, then divide by the number of first-time customers acquired in that same period. Use a consistent allocation policy for shared staff, software, and agency costs.",
  },
  {
    question: "Which costs should be included in CAC?",
    answer:
      "Common inputs include advertising, campaign production, sales and marketing compensation, commissions, acquisition software, agencies, events, and directly related overhead. Include only costs tied to acquisition and document how shared costs are allocated.",
  },
  {
    question: "What is the difference between blended and paid CAC?",
    answer:
      "Blended CAC divides acquisition costs across customers from all channels, including organic demand. Paid CAC focuses on customers and costs assigned to paid acquisition. Both can be useful, but the numerator and denominator must cover the same scope.",
  },
  {
    question: "Should existing customers be included?",
    answer:
      "Not in a new-customer CAC calculation. Count first-time customers acquired during the period. Costs for retention, support, or expansion belong in separate metrics unless your documented CAC policy intentionally includes them.",
  },
  {
    question: "What is a good CAC?",
    answer:
      "CAC is sustainable only in relation to customer gross profit, retention, payback time, and cash flow. Compare it with customer lifetime contribution and your ability to fund the payback period instead of using an industry-wide number alone.",
  },
  {
    question: "How can Rybbit support CAC measurement?",
    answer:
      "Rybbit can measure campaign visits, conversions, funnels, and acquisition journeys. Combine those counts with your advertising and operating costs, keeping channel definitions and attribution windows consistent between systems.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "CAC Calculator",
      description: "A free calculator for blended customer acquisition cost and cost allocation.",
      url: "https://rybbit.com/tools/cac-calculator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Organization", name: "Rybbit", url: "https://rybbit.com" },
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
    <h2>What is customer acquisition cost?</h2>
    <p>
      Customer acquisition cost, or CAC, is the average sales and marketing cost required to add one new customer. It
      turns acquisition activity into a unit-economics measure you can compare with customer contribution, payback
      period, and retention.
    </p>

    <h2>CAC formula</h2>
    <p>
      Use <code>CAC = total acquisition costs ÷ new customers acquired</code>. If sales and marketing costs total
      $23,000 during a quarter and 100 first-time customers are acquired, blended CAC is $230.
    </p>

    <h2>Build a consistent numerator</h2>
    <ul>
      <li>Include advertising and campaign production for the measured period.</li>
      <li>Allocate relevant sales and marketing compensation with a documented method.</li>
      <li>Include acquisition software, agencies, commissions, and events where applicable.</li>
      <li>Keep retention and customer-success costs separate unless your policy says otherwise.</li>
      <li>Use the same policy from period to period so changes reflect performance rather than accounting drift.</li>
    </ul>

    <h2>Match costs with customers</h2>
    <p>
      CAC becomes misleading when costs from one period are divided by customers from another, or when all costs are
      compared with customers assigned to only one channel. Longer sales cycles may require cohort-based attribution or
      a rolling window. Document those choices before comparing teams or periods.
    </p>

    <h2>Use CAC with payback and retention</h2>
    <p>
      Lower CAC is not automatically better if it brings customers who leave quickly or contribute little margin. Review
      CAC with gross profit, payback period, retention, and acquisition volume to understand whether growth is both
      efficient and durable.
    </p>
  </>
);

export default function CACCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="cac-calculator"
      title="CAC Calculator"
      description="Calculate blended customer acquisition cost and see exactly which costs drive the result."
      toolComponent={<CACCalculatorForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Measure every step from campaign to conversion"
      ctaDescription="Use privacy-friendly analytics to understand acquisition paths and conversion volume."
      ctaEventLocation="cac_calculator_cta"
      structuredData={structuredData}
    />
  );
}
