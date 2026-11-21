import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { ChurnRateForm } from "./ChurnRateForm";

export const metadata: Metadata = {
  title: "Free Churn Rate Calculator | Rybbit",
  description:
    "Calculate customer or revenue churn for any reporting period. See churn, retention, and remaining customers or revenue with clear formulas and instant results.",
  openGraph: {
    title: "Free Churn Rate Calculator",
    description: "Calculate customer or revenue churn and the corresponding retention rate.",
    type: "website",
    url: "https://rybbit.com/tools/churn-rate-calculator",
    siteName: "Rybbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Churn Rate Calculator",
    description: "Calculate customer or revenue churn and the corresponding retention rate.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/churn-rate-calculator",
  },
};

const faqData = [
  {
    question: "How do I calculate customer churn rate?",
    answer:
      "Divide the number of customers lost during a period by the number of customers at the start of that period, then multiply by 100. Do not add newly acquired customers to the starting cohort.",
  },
  {
    question: "What is revenue churn?",
    answer:
      "Revenue churn measures recurring revenue lost from cancellations and downgrades as a percentage of recurring revenue at the start of the period. This calculator shows gross revenue churn and does not subtract expansion revenue.",
  },
  {
    question: "What is the relationship between churn and retention?",
    answer:
      "For the same cohort and period, customer churn and customer retention are complementary: retention equals 100% minus churn. Revenue retention may also account for expansion, so it can differ from this simple relationship.",
  },
  {
    question: "Should I calculate churn monthly or annually?",
    answer:
      "Choose a period that matches how customers pay and how often your team makes decisions. Monthly churn is common for subscription products, but longer sales cycles may benefit from quarterly or annual reporting. Label the period clearly and compare like with like.",
  },
  {
    question: "Why should customer churn and revenue churn be tracked separately?",
    answer:
      "Customers do not all contribute the same revenue. Losing a small high-value account can produce low customer churn but high revenue churn, while losing several small accounts can create the opposite pattern.",
  },
  {
    question: "How can Rybbit help investigate churn?",
    answer:
      "Rybbit can show funnels, retention, journeys, events, and session replays leading up to cancellation or disengagement. Those behavioral signals help teams form and test specific churn-reduction hypotheses.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Churn Rate Calculator",
      description: "Calculate customer churn, revenue churn, and the corresponding retention rate.",
      url: "https://rybbit.com/tools/churn-rate-calculator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqData.map(item => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

const educationalContent = (
  <>
    <h2>What is churn rate?</h2>
    <p>
      Churn rate is the share of a starting customer or recurring-revenue base lost during a defined period. It makes
      losses comparable as a percentage, even when the size of the business changes.
    </p>

    <h2>Customer churn and revenue churn answer different questions</h2>
    <p>
      Customer churn counts lost accounts. Revenue churn counts recurring revenue removed through cancellations or
      downgrades. Track both: a low number of lost accounts can still have a large financial impact when those accounts
      are high value.
    </p>
    <ul>
      <li>
        <strong>Customer churn:</strong> customers lost ÷ customers at the start × 100.
      </li>
      <li>
        <strong>Gross revenue churn:</strong> recurring revenue lost ÷ recurring revenue at the start × 100.
      </li>
      <li>
        <strong>Retention:</strong> for the same customer cohort, 100% minus customer churn.
      </li>
    </ul>

    <h2>Measure a consistent cohort</h2>
    <p>
      Use a starting value captured at the beginning of the period and losses from that same population. Keep new
      acquisitions out of the starting cohort, and separate expansion revenue when you want gross churn. Consistent
      definitions make trends more useful than a single isolated result.
    </p>
  </>
);

export default function ChurnRateCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="churn-rate-calculator"
      title="Churn Rate Calculator"
      description="Calculate customer or recurring-revenue churn for a month, quarter, or year and see the corresponding retention at a glance."
      badge="Free Tool"
      toolComponent={<ChurnRateForm />}
      educationalContent={educationalContent}
      faqs={faqData}
      relatedToolsCategory="analytics"
      ctaTitle="Find the behavior behind churn"
      ctaDescription="Use Rybbit funnels, retention reports, events, and session replays to understand where customers disengage."
      ctaEventLocation="churn_rate_calculator_cta"
      structuredData={structuredData}
    />
  );
}
