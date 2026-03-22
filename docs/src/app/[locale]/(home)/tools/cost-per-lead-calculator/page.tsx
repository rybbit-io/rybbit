import { ToolPageLayout } from "../components/ToolPageLayout";
import { CostPerLeadForm } from "./CostPerLeadForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Cost Per Lead (CPL) Calculator | Measure Lead Generation Efficiency",
  description:
    "Calculate cost per lead instantly with our free CPL calculator. Compare across channels, optimize marketing spend, and improve lead generation ROI.",
  openGraph: {
    title: "Free Cost Per Lead (CPL) Calculator",
    description: "Calculate and optimize your cost per lead with channel-specific benchmarks",
    type: "website",
    url: "https://rybbit.com/tools/cost-per-lead-calculator",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free CPL Calculator",
    description: "Calculate your cost per lead and compare against channel benchmarks",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/cost-per-lead-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Cost Per Lead Calculator",
      description: "Free CPL calculator to measure lead generation costs and compare against channel benchmarks",
      url: "https://rybbit.com/tools/cost-per-lead-calculator",
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
          name: "What is Cost Per Lead (CPL)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cost Per Lead (CPL) is the total cost of generating one qualified lead through marketing efforts. It's calculated by dividing total marketing spend by the number of leads generated.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate CPL?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CPL = Total Marketing Spend ÷ Number of Leads. For example, if you spent $5,000 and generated 50 leads, your CPL would be $100.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good CPL?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good CPL varies by channel and industry. SEO/Organic averages $31, Email Marketing $53, Facebook Ads $97, and LinkedIn Ads $75. The key is that your CPL should be low enough to maintain profitable customer acquisition when factoring in lead-to-customer conversion rates.",
          },
        },
        {
          "@type": "Question",
          name: "How can I lower my CPL?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Lower CPL by improving targeting, optimizing landing pages, refining ad copy, testing different channels, improving lead quality filters, and enhancing conversion paths.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What is Cost Per Lead (CPL)?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Cost Per Lead (CPL) measures how much it costs to generate one qualified lead through your marketing efforts.
      Unlike CPA (Cost Per Acquisition), which measures the cost to acquire a paying customer, CPL focuses on the
      earlier stage of getting potential customers into your sales funnel.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
      Understanding CPL is essential for evaluating lead generation campaigns, comparing channel effectiveness, and
      optimizing marketing budgets. It's particularly important for B2B businesses and companies with longer sales
      cycles where leads require nurturing before conversion.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Calculate CPL</h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          CPL = Total Marketing Spend ÷ Number of Leads
        </div>
      </div>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong>Example:</strong> If you spent $5,000 on a campaign and generated 50 leads:
        </p>
        <p className="text-center font-mono">CPL = $5,000 ÷ 50 = $100 per lead</p>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Channel Benchmarks</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>SEO/Organic:</strong> $31 (highest ROI long-term)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Email Marketing:</strong> $53 (low cost, existing audience)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Webinars:</strong> $72 (high engagement)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>LinkedIn Ads:</strong> $75 (B2B targeting)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Content Marketing:</strong> $92 (builds authority)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Instagram Ads:</strong> $94 (visual engagement)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Facebook Ads:</strong> $97 (broad reach)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Google Ads:</strong> $116 (high intent traffic)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Overall Average:</strong> $198
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Trade Shows:</strong> $811 (high cost, face-to-face)
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Why CPL Matters</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Channel comparison:</strong> Identify which marketing channels deliver the most cost-effective leads
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Budget optimization:</strong> Allocate resources to the highest-performing channels
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Campaign evaluation:</strong> Measure effectiveness of specific campaigns or tactics
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Sales forecasting:</strong> Predict pipeline growth based on lead generation costs
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
      CPL vs CPA: Understanding the Difference
    </h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      CPL and CPA represent different stages of the customer journey:
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <div className="font-semibold text-neutral-900 dark:text-white mb-2">Cost Per Lead (CPL)</div>
        <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
          <li>Measures lead generation cost</li>
          <li>Top of funnel metric</li>
          <li>Typically lower cost</li>
          <li>Focus on volume and quality</li>
        </ul>
      </div>
      <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <div className="font-semibold text-neutral-900 dark:text-white mb-2">Cost Per Acquisition (CPA)</div>
        <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
          <li>Measures customer acquisition cost</li>
          <li>Bottom of funnel metric</li>
          <li>Typically higher cost</li>
          <li>Focus on conversions and ROI</li>
        </ul>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Lower Your CPL</h3>
    <ol className="space-y-3 mb-6 list-decimal list-inside text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Improve targeting:</strong> Focus on audiences most likely to become qualified leads
      </li>
      <li>
        <strong>Optimize landing pages:</strong> Increase conversion rates with clear value propositions and simple
        forms
      </li>
      <li>
        <strong>Refine ad copy:</strong> Test different messages to improve click-through and conversion rates
      </li>
      <li>
        <strong>Test different channels:</strong> Experiment to find the most cost-effective lead sources for your
        business
      </li>
      <li>
        <strong>Improve lead quality filters:</strong> Define clear qualification criteria to avoid wasting budget on
        poor-fit leads
      </li>
      <li>
        <strong>Leverage organic channels:</strong> Invest in SEO and content marketing for long-term low-CPL lead
        generation
      </li>
    </ol>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
      Calculating True Customer Acquisition Cost
    </h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      To understand your full customer acquisition cost, you need to factor in your lead-to-customer conversion rate:
    </p>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 mb-6">
      <div className="text-center text-neutral-900 dark:text-white font-mono text-sm">
        CPA = CPL ÷ Lead-to-Customer Conversion Rate
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center mt-2">
        Example: $100 CPL ÷ 20% conversion = $500 CPA
      </p>
    </div>
  </>
);

const faqs = [
  {
    question: "What is Cost Per Lead (CPL)?",
    answer:
      "Cost Per Lead (CPL) is the total cost of generating one qualified lead through marketing efforts. It's calculated by dividing total marketing spend by the number of leads generated, helping businesses measure the efficiency of their lead generation campaigns.",
  },
  {
    question: "How do I calculate CPL?",
    answer:
      "CPL = Total Marketing Spend ÷ Number of Leads. For example, if you spent $5,000 and generated 50 leads, your CPL would be $100.",
  },
  {
    question: "What is a good CPL?",
    answer:
      "A good CPL varies by channel and industry. SEO/Organic averages $31, Email Marketing $53, Facebook Ads $97, and LinkedIn Ads $75. The key is that your CPL should be low enough to maintain profitable customer acquisition when factoring in your lead-to-customer conversion rate.",
  },
  {
    question: "How is CPL different from CPA?",
    answer: (
      <>
        CPL measures the cost to generate a lead (top of funnel), while{" "}
        <Link
          href="/tools/cost-per-acquisition-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          CPA
        </Link>{" "}
        measures the cost to acquire a paying customer (bottom of funnel). CPA is typically higher since not all leads
        convert to customers. CPA = CPL ÷ Lead-to-Customer Conversion Rate.
      </>
    ),
  },
  {
    question: "How can I lower my CPL?",
    answer:
      "Lower CPL by improving audience targeting, optimizing landing pages for better conversion rates, refining ad copy and creative, testing different marketing channels, implementing better lead quality filters, and investing in organic channels like SEO and content marketing.",
  },
  {
    question: "What's the relationship between CPL and conversion rate?",
    answer: (
      <>
        Your{" "}
        <Link
          href="/tools/conversion-rate-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          conversion rate
        </Link>{" "}
        from visitor to lead directly impacts CPL. If you double your landing page conversion rate, you can cut your CPL
        in half with the same ad spend. Focus on both reducing traffic costs AND improving conversion rates to minimize
        CPL.
      </>
    ),
  },
];

export default function CostPerLeadPage() {
  return (
    <ToolPageLayout
      toolSlug="cost-per-lead-calculator"
      title="Cost Per Lead (CPL) Calculator"
      description="Calculate cost per lead and compare across marketing channels to optimize your lead generation strategy and maximize ROI"
      badge="Free Tool"
      toolComponent={<CostPerLeadForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track CPL and lead metrics with Rybbit"
      ctaDescription="Monitor cost per lead, lead quality, and channel performance in real-time with Rybbit's analytics platform."
      ctaEventLocation="cost_per_lead_calculator_cta"
      structuredData={structuredData}
    />
  );
}
