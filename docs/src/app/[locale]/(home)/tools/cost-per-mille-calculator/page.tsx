import { ToolPageLayout } from "../components/ToolPageLayout";
import { CostPerMilleForm } from "./CostPerMilleForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free CPM Calculator | Cost Per Mille (Thousand Impressions)",
  description:
    "Calculate CPM (cost per thousand impressions) instantly with our free calculator. Compare across platforms, optimize ad spend, and improve campaign efficiency.",
  openGraph: {
    title: "Free CPM Calculator (Cost Per Mille)",
    description: "Calculate and optimize your CPM with platform-specific benchmarks",
    type: "website",
    url: "https://rybbit.com/tools/cost-per-mille-calculator",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free CPM Calculator",
    description: "Calculate your CPM and compare against platform benchmarks",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/cost-per-mille-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "CPM Calculator",
      description:
        "Free CPM calculator to measure cost per thousand impressions and compare against platform benchmarks",
      url: "https://rybbit.com/tools/cost-per-mille-calculator",
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
          name: "What is CPM (Cost Per Mille)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CPM (Cost Per Mille) is the cost of 1,000 advertising impressions. 'Mille' is Latin for thousand. It's calculated by dividing total ad spend by total impressions and multiplying by 1,000.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate CPM?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CPM = (Total Ad Spend ÷ Total Impressions) × 1,000. For example, if you spent $5,000 and received 500,000 impressions, your CPM would be $10.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good CPM?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good CPM varies by platform. Google Display averages $2.80, Facebook Feed around $11.20, Instagram Stories $6.70, and LinkedIn $33.80. Lower CPMs indicate more efficient reach, but should be balanced with engagement and conversion quality.",
          },
        },
        {
          "@type": "Question",
          name: "How can I lower my CPM?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Lower CPM by improving ad quality scores, refining audience targeting, testing different ad formats, optimizing bid strategies, and focusing on platforms with naturally lower CPMs for your audience.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What is CPM (Cost Per Mille)?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      CPM, or Cost Per Mille, measures the cost of 1,000 advertising impressions. The term "mille" comes from Latin,
      meaning "thousand." It's a fundamental metric in display advertising that helps marketers understand how
      efficiently they're reaching their audience.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
      CPM is particularly useful for brand awareness campaigns where the goal is maximum visibility rather than
      immediate conversions. It allows you to compare costs across different platforms, ad formats, and campaigns on an
      apples-to-apples basis.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Calculate CPM</h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          CPM = (Total Ad Spend ÷ Total Impressions) × 1,000
        </div>
      </div>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong>Example:</strong> If you spent $5,000 and received 500,000 impressions:
        </p>
        <p className="text-center font-mono">CPM = ($5,000 ÷ 500,000) × 1,000 = $10</p>
        <p className="pt-2">This means you paid $10 for every 1,000 times your ad was shown.</p>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Platform Benchmarks</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Google Search:</strong> $38.40 (high intent, competitive)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>LinkedIn:</strong> $33.80 (B2B targeting premium)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Pinterest:</strong> $30.00 (visual discovery)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Facebook Feed:</strong> $11.20 (broad reach)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>YouTube:</strong> $9.68 (video content)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>TikTok:</strong> $9.42 (younger demographics)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Instagram Feed:</strong> $7.91 (visual engagement)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Instagram Stories:</strong> $6.70 (ephemeral content)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Twitter:</strong> $6.46 (real-time engagement)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Google Display:</strong> $2.80 (broad awareness)
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Why CPM Matters</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Compare platforms:</strong> Evaluate cost efficiency across different advertising channels
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Budget allocation:</strong> Determine where to invest for maximum reach
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Campaign planning:</strong> Forecast impressions and reach for given budgets
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Performance tracking:</strong> Monitor how costs change over time and across campaigns
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Lower Your CPM</h3>
    <ol className="space-y-3 mb-6 list-decimal list-inside text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Improve ad quality:</strong> Higher relevance scores on platforms like Facebook and Google reduce CPM
      </li>
      <li>
        <strong>Refine targeting:</strong> Narrow audiences to more engaged, relevant users
      </li>
      <li>
        <strong>Test ad formats:</strong> Some formats (Stories, Reels) often have lower CPMs than feed placements
      </li>
      <li>
        <strong>Optimize bid strategy:</strong> Use automatic bidding or target CPM bidding to find efficiency
      </li>
      <li>
        <strong>Choose the right platform:</strong> Match platforms to your audience demographics and campaign goals
      </li>
      <li>
        <strong>Avoid peak times:</strong> Run ads during less competitive hours or seasons
      </li>
    </ol>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">CPM vs Other Pricing Models</h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Understanding different ad pricing models helps choose the right approach:
    </p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CPM (Cost Per Mille):</strong> Best for brand awareness and reach campaigns
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CPC (Cost Per Click):</strong> Better for traffic and engagement-focused campaigns
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CPA (Cost Per Acquisition):</strong> Ideal for conversion-focused campaigns
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CPV (Cost Per View):</strong> Specifically for video advertising campaigns
      </li>
    </ul>
  </>
);

const faqs = [
  {
    question: "What is CPM (Cost Per Mille)?",
    answer:
      "CPM (Cost Per Mille) is the cost of 1,000 advertising impressions. 'Mille' is Latin for thousand. It's calculated by dividing total ad spend by total impressions and multiplying by 1,000. CPM is a standard metric for comparing advertising costs across platforms and campaigns.",
  },
  {
    question: "How do I calculate CPM?",
    answer:
      "CPM = (Total Ad Spend ÷ Total Impressions) × 1,000. For example, if you spent $5,000 and received 500,000 impressions, your CPM would be $10.",
  },
  {
    question: "What is a good CPM?",
    answer:
      "A good CPM varies significantly by platform and industry. Google Display averages $2.80, Facebook Feed around $11.20, Instagram Stories $6.70, and LinkedIn $33.80. Lower CPMs indicate more efficient reach, but remember that cheaper impressions don't always mean better results—consider engagement and conversion quality too.",
  },
  {
    question: "What's the difference between CPM and CPC?",
    answer:
      "CPM (Cost Per Mille) charges per 1,000 impressions regardless of clicks, while CPC (Cost Per Click) charges only when someone clicks your ad. CPM is better for brand awareness campaigns focused on reach, while CPC is better for performance campaigns focused on driving traffic or conversions.",
  },
  {
    question: "How can I lower my CPM?",
    answer:
      "Lower CPM by improving ad quality and relevance scores, refining audience targeting to more engaged users, testing different ad formats (Stories/Reels often have lower CPMs), optimizing bid strategies, choosing appropriate platforms for your audience, and avoiding peak competitive times.",
  },
  {
    question: "When should I use CPM bidding?",
    answer: (
      <>
        Use CPM bidding for brand awareness campaigns where your goal is maximum visibility and reach rather than
        immediate clicks or conversions. For conversion-focused campaigns, consider{" "}
        <Link
          href="/tools/cost-per-acquisition-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          CPA
        </Link>{" "}
        or CPC bidding instead.
      </>
    ),
  },
];

export default function CostPerMillePage() {
  return (
    <ToolPageLayout
      toolSlug="cost-per-mille-calculator"
      title="CPM Calculator (Cost Per Mille)"
      description="Calculate cost per thousand impressions and compare across advertising platforms to optimize your media spend"
      badge="Free Tool"
      toolComponent={<CostPerMilleForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track CPM and ad performance with Rybbit"
      ctaDescription="Monitor CPM, impressions, and campaign metrics across all platforms in real-time with Rybbit's analytics."
      ctaEventLocation="cost_per_mille_calculator_cta"
      structuredData={structuredData}
    />
  );
}
