import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { MRRARRCalculatorForm } from "./MRRARRCalculatorForm";

export const metadata: Metadata = {
  title: "Free MRR and ARR Calculator | Rybbit",
  description:
    "Calculate MRR and ARR from a starting subscriber or revenue baseline. Apply expansion and contraction to see the ending recurring revenue run rate and forecast.",
  openGraph: {
    title: "Free MRR and ARR Calculator",
    description: "Calculate monthly and annual recurring revenue with expansion and contraction.",
    type: "website",
    url: "https://rybbit.com/tools/mrr-arr-calculator",
    siteName: "Rybbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free MRR and ARR Calculator",
    description: "Calculate monthly and annual recurring revenue with expansion and contraction.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/mrr-arr-calculator",
  },
};

const faqData = [
  {
    question: "What is MRR?",
    answer:
      "Monthly recurring revenue is the normalized recurring revenue a subscription business expects in one month. It excludes one-time setup fees, services, and other non-recurring charges.",
  },
  {
    question: "How do I calculate ARR from MRR?",
    answer:
      "Multiply MRR by 12. This annualizes the current recurring-revenue run rate; it is not the same as recognized revenue or a guaranteed forecast because customers and plans can change.",
  },
  {
    question: "What counts as expansion and contraction MRR?",
    answer:
      "Expansion MRR comes from recurring upgrades or add-ons from existing customers. Contraction MRR comes from recurring downgrades, discounts, and cancellations. One-time purchases should not be included.",
  },
  {
    question: "Should annual subscriptions be included in MRR?",
    answer:
      "Yes. Normalize an annual subscription into a monthly amount by dividing its recurring annual value by 12. Apply the same normalization to quarterly or other billing intervals.",
  },
  {
    question: "Is ARR the same as annual revenue?",
    answer:
      "No. ARR is an annualized recurring-revenue run rate at a point in time. Annual revenue is what accounting records during a year and can include one-time revenue, usage charges, refunds, and changes in the customer base.",
  },
  {
    question: "How can Rybbit support recurring revenue analysis?",
    answer:
      "Rybbit can measure acquisition funnels, product events, cohorts, and retention behavior around subscription growth. Pair those signals with billing data to understand the customer actions behind recurring-revenue changes.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "MRR and ARR Calculator",
      description: "Calculate monthly recurring revenue, annual recurring revenue, and recurring revenue movement.",
      url: "https://rybbit.com/tools/mrr-arr-calculator",
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
    <h2>MRR and ARR turn subscriptions into a comparable run rate</h2>
    <p>
      Monthly recurring revenue normalizes active subscriptions into one month. Annual recurring revenue multiplies that
      monthly run rate by 12. Together they make recurring revenue easier to compare across billing intervals and
      reporting periods.
    </p>

    <h2>How to calculate recurring revenue</h2>
    <ul>
      <li>
        <strong>Starting MRR:</strong> active subscribers × average monthly recurring revenue per subscriber.
      </li>
      <li>
        <strong>Ending MRR:</strong> starting MRR + expansion MRR − contraction and churned MRR.
      </li>
      <li>
        <strong>Ending ARR:</strong> ending MRR × 12.
      </li>
    </ul>
    <p>
      Normalize annual and quarterly plans into monthly values before adding them. Exclude setup fees, consulting,
      hardware, and other one-time revenue so the result remains a recurring run rate.
    </p>

    <h2>Use the run rate with context</h2>
    <p>
      ARR is a snapshot, not a promise. Review new MRR, expansion, contraction, and churn separately to understand why
      the total moved. Pair billing metrics with acquisition and retention behavior to find the product experiences that
      create durable recurring growth.
    </p>
  </>
);

export default function MRRARRCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="mrr-arr-calculator"
      title="MRR and ARR Calculator"
      description="Start with subscriber data or MRR, apply expansion and contraction, and calculate the resulting monthly and annual run rate."
      badge="Free Tool"
      toolComponent={<MRRARRCalculatorForm />}
      educationalContent={educationalContent}
      faqs={faqData}
      relatedToolsCategory="analytics"
      ctaTitle="Connect recurring growth to product behavior"
      ctaDescription="Use Rybbit to understand the funnels, events, and retention patterns behind subscription acquisition and churn."
      ctaEventLocation="mrr_arr_calculator_cta"
      structuredData={structuredData}
    />
  );
}
