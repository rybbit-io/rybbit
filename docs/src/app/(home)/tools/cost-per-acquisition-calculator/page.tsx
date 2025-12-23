import { ToolPageLayout } from "../components/ToolPageLayout";
import { CostPerAcquisitionForm } from "./CostPerAcquisitionForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Cost Per Acquisition (CPA) Calculator | Measure Campaign Efficiency",
  description:
    "Calculate your cost per acquisition instantly with our free CPA calculator. Compare against industry benchmarks, optimize your marketing spend, and improve campaign ROI.",
  openGraph: {
    title: "Free Cost Per Acquisition (CPA) Calculator",
    description: "Calculate and optimize your customer acquisition costs with industry benchmarks",
    type: "website",
    url: "https://rybbit.com/tools/cost-per-acquisition-calculator",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free CPA Calculator",
    description: "Calculate your cost per acquisition and compare against industry benchmarks",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/cost-per-acquisition-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Cost Per Acquisition Calculator",
      description: "Free CPA calculator to measure customer acquisition costs and compare against industry benchmarks",
      url: "https://rybbit.com/tools/cost-per-acquisition-calculator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Cost Per Acquisition (CPA)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cost Per Acquisition (CPA) is a marketing metric that measures the total cost of acquiring one paying customer. It's calculated by dividing total marketing spend by the number of conversions or acquisitions.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate CPA?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CPA = Total Marketing Spend ÷ Number of Conversions. For example, if you spent $10,000 and acquired 150 customers, your CPA would be $66.67.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good CPA?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good CPA varies by industry and business model. E-commerce averages $45, SaaS around $205, and B2B approximately $197. The key is that your CPA should be significantly lower than your customer lifetime value (CLV).",
          },
        },
        {
          "@type": "Question",
          name: "How can I lower my CPA?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Lower your CPA by improving targeting, optimizing landing pages, A/B testing ad creatives, refining audience segments, improving conversion rates, and focusing on high-performing channels.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What is Cost Per Acquisition (CPA)?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Cost Per Acquisition (CPA) is a critical marketing metric that measures how much it costs your business to acquire
      one paying customer through your marketing efforts. It's calculated by dividing your total marketing spend by the
      number of conversions or acquisitions during a specific period.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
      Understanding your CPA is essential for evaluating marketing campaign effectiveness, allocating budgets
      efficiently, and ensuring your customer acquisition strategy is profitable and sustainable.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Calculate CPA</h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          CPA = Total Marketing Spend ÷ Number of Conversions
        </div>
      </div>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong>Example:</strong> If you spent $10,000 on a campaign and acquired 150 customers:
        </p>
        <p className="text-center font-mono">CPA = $10,000 ÷ 150 = $66.67 per customer</p>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Industry Benchmarks</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>E-commerce:</strong> $45.27 average CPA
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>SaaS:</strong> $205 average CPA
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>B2B:</strong> $197 average CPA
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Finance:</strong> $44 average CPA
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Travel:</strong> $7.19 average CPA
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Why CPA Matters</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Profitability:</strong> Ensures acquisition costs don't exceed customer value
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Budget optimization:</strong> Identifies which channels deliver the best ROI
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Campaign performance:</strong> Measures effectiveness of marketing initiatives
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Strategic planning:</strong> Informs scaling decisions and growth strategies
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Reduce Your CPA</h3>
    <ol className="space-y-3 mb-6 list-decimal list-inside text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Improve targeting:</strong> Focus on high-intent audiences with precise demographic and behavioral
        targeting
      </li>
      <li>
        <strong>Optimize landing pages:</strong> Increase conversion rates with clear CTAs, fast load times, and
        compelling copy
      </li>
      <li>
        <strong>A/B test creatives:</strong> Continuously test ad variations to improve click-through and conversion
        rates
      </li>
      <li>
        <strong>Refine audience segments:</strong> Exclude low-performing segments and double down on converters
      </li>
      <li>
        <strong>Improve quality scores:</strong> Higher ad relevance reduces costs on platforms like Google Ads
      </li>
      <li>
        <strong>Leverage retargeting:</strong> Re-engage warm audiences who are more likely to convert at lower costs
      </li>
    </ol>
  </>
);

const faqs = [
  {
    question: "What is Cost Per Acquisition (CPA)?",
    answer:
      "Cost Per Acquisition (CPA) is a marketing metric that measures the total cost of acquiring one paying customer. It's calculated by dividing total marketing spend by the number of conversions or acquisitions.",
  },
  {
    question: "How do I calculate CPA?",
    answer:
      "CPA = Total Marketing Spend ÷ Number of Conversions. For example, if you spent $10,000 and acquired 150 customers, your CPA would be $66.67.",
  },
  {
    question: "What is a good CPA?",
    answer:
      "A good CPA varies by industry and business model. E-commerce averages $45, SaaS around $205, and B2B approximately $197. The key is that your CPA should be significantly lower than your customer lifetime value (CLV) to ensure profitability.",
  },
  {
    question: "How is CPA different from CPL (Cost Per Lead)?",
    answer: (
      <>
        CPA measures the cost to acquire a paying customer, while CPL measures the cost to acquire a lead (who may or
        may not convert). CPA is typically higher than CPL because it accounts for the full conversion funnel. Learn
        more with our{" "}
        <Link href="/tools/cost-per-lead-calculator" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Cost Per Lead Calculator
        </Link>
        .
      </>
    ),
  },
  {
    question: "How can I lower my CPA?",
    answer:
      "Lower your CPA by improving targeting, optimizing landing pages, A/B testing ad creatives, refining audience segments, improving conversion rates, and focusing on high-performing channels. Also consider improving your quality scores on ad platforms to reduce costs.",
  },
  {
    question: "What's the relationship between CPA and CLV?",
    answer: (
      <>
        Your CPA should be significantly lower than your Customer Lifetime Value (CLV) to ensure profitability. A common
        rule is that CLV should be at least 3x your CPA. Calculate your CLV with our{" "}
        <Link
          href="/tools/customer-lifetime-value-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Customer Lifetime Value Calculator
        </Link>
        .
      </>
    ),
  },
];

export default function CostPerAcquisitionPage() {
  return (
    <ToolPageLayout
      toolSlug="cost-per-acquisition-calculator"
      title="Cost Per Acquisition (CPA) Calculator"
      description="Calculate your customer acquisition costs and compare against industry benchmarks to optimize your marketing ROI"
      badge="Free Tool"
      toolComponent={<CostPerAcquisitionForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track your acquisition costs with Rybbit"
      ctaDescription="Monitor CPA, conversion rates, and campaign performance in real-time with Rybbit's analytics platform."
      ctaEventLocation="cost_per_acquisition_calculator_cta"
      structuredData={structuredData}
    />
  );
}
