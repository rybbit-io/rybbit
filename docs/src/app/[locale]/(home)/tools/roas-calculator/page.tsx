import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { ROASCalculatorForm } from "./ROASCalculatorForm";

export const metadata: Metadata = {
  title: "Free ROAS Calculator | Return on Ad Spend",
  description:
    "Calculate return on ad spend from advertising cost and attributed revenue. Include gross margin to estimate break-even ROAS and profit after ad spend.",
  openGraph: {
    title: "Free ROAS Calculator | Return on Ad Spend",
    description: "Calculate revenue ROAS, break-even ROAS, and gross profit after advertising costs.",
    type: "website",
    url: "https://rybbit.com/tools/roas-calculator",
    siteName: "Rybbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free ROAS Calculator | Return on Ad Spend",
    description: "Calculate ROAS and see how gross margin changes the break-even point.",
  },
  alternates: { canonical: "https://rybbit.com/tools/roas-calculator" },
};

const faqs = [
  {
    question: "How do I calculate ROAS?",
    answer:
      "Divide revenue attributed to advertising by the cost of that advertising. If a campaign generated $12,000 from $3,000 in ad spend, its revenue ROAS is 4.00×.",
  },
  {
    question: "What is the difference between ROAS and ROI?",
    answer:
      "ROAS compares attributed revenue with ad spend. ROI compares profit with the broader investment required to produce it. ROAS is narrower and useful for campaign efficiency, while ROI gives a more complete profitability view when all relevant costs are included.",
  },
  {
    question: "How does gross margin affect break-even ROAS?",
    answer:
      "Revenue is not the same as gross profit. At a 50% gross margin, each dollar of revenue contributes fifty cents before advertising, so the revenue ROAS needed to recover ad spend is 2.00×. Lower margins require a higher break-even ROAS.",
  },
  {
    question: "What counts as attributed revenue?",
    answer:
      "Use revenue credited to the ads under your chosen attribution model and window. Keep that model and period consistent with the ad-spend figure. If attribution is uncertain, compare more than one model rather than treating one number as exact.",
  },
  {
    question: "What is a good ROAS?",
    answer:
      "A sustainable target depends on gross margin, operating expenses, repeat purchases, returns, and growth goals. Your break-even ROAS is a more useful starting point than a generic benchmark because it reflects your economics.",
  },
  {
    question: "How can Rybbit support ROAS analysis?",
    answer:
      "Rybbit can capture campaign parameters, conversions, and customer journeys without relying on invasive visitor profiles. Pair consistent campaign tracking with your ad-platform costs and revenue source to evaluate performance.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "ROAS Calculator",
      description: "A free return on ad spend calculator with margin-aware break-even analysis.",
      url: "https://rybbit.com/tools/roas-calculator",
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
    <h2>What is ROAS?</h2>
    <p>
      Return on ad spend measures how much attributed revenue advertising produces for each unit of spend. It is a
      focused campaign-efficiency metric. It does not automatically account for product costs, agency fees, salaries,
      returns, or overhead.
    </p>

    <h2>ROAS formulas</h2>
    <p>
      The basic formula is <code>ROAS = attributed revenue ÷ ad spend</code>. A result of 3.5× means the campaign
      generated 3.50 in revenue for every 1.00 spent on advertising. To add an economic check, calculate gross profit as
      revenue multiplied by gross margin, then subtract ad spend.
    </p>
    <p>
      Break-even revenue ROAS can be estimated with <code>1 ÷ gross margin rate</code>. For example, a 40% gross margin
      implies a 2.5× break-even ROAS before overhead and other costs.
    </p>

    <h2>Use matching inputs</h2>
    <ul>
      <li>Use revenue and ad spend from the same date range, campaign scope, and currency.</li>
      <li>Document the attribution model and conversion window behind the revenue figure.</li>
      <li>Deduct refunds or cancellations consistently if they are material.</li>
      <li>Use a product-level margin when product mix differs substantially across campaigns.</li>
    </ul>

    <h2>Read ROAS alongside business outcomes</h2>
    <p>
      A high ROAS can still hide low scale, delayed returns, or weak customer quality. A lower ROAS may be intentional
      when acquiring customers with valuable repeat purchases. Review contribution profit, customer acquisition cost,
      payback period, and conversion quality before changing spend.
    </p>
  </>
);

export default function ROASCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="roas-calculator"
      title="ROAS Calculator"
      description="Calculate revenue efficiency, margin-adjusted profit, and your campaign's break-even ROAS."
      toolComponent={<ROASCalculatorForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Understand the journey behind attributed revenue"
      ctaDescription="Track campaigns, conversions, and user paths with privacy-friendly web analytics."
      ctaEventLocation="roas_calculator_cta"
      structuredData={structuredData}
    />
  );
}
