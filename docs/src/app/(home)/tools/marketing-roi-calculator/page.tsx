import { MarketingROIForm } from "./MarketingROIForm";
import { ToolPageLayout } from "../components/ToolPageLayout";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Marketing ROI Calculator | Calculate Return on Investment & ROAS",
  description:
    "Calculate your marketing ROI, ROAS, profit margins, and net profit. Get instant insights into your campaign performance and make data-driven decisions.",
  openGraph: {
    title: "Free Marketing ROI Calculator | Calculate Return on Investment & ROAS",
    description: "Calculate your marketing ROI, ROAS, profit margins, and net profit instantly.",
    type: "website",
    url: "https://rybbit.com/tools/marketing-roi-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Marketing ROI Calculator | Calculate Return on Investment & ROAS",
    description: "Calculate your marketing ROI, ROAS, profit margins, and net profit instantly.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/marketing-roi-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Marketing ROI Calculator",
      description: "Calculate ROI, ROAS, profit margins, and net profit for your marketing campaigns",
      url: "https://rybbit.com/tools/marketing-roi-calculator",
      applicationCategory: "BusinessApplication",
      featureList: [
        "ROI Calculation",
        "ROAS Calculation",
        "Profit Margin Analysis",
        "Net Profit Calculation",
        "Real-time Results",
      ],
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
          name: "What is ROI vs ROAS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ROI (Return on Investment) measures your profit as a percentage of your investment, calculated as (Revenue - Cost) / Cost × 100. ROAS (Return on Ad Spend) measures revenue per dollar spent on advertising, calculated as Revenue / Ad Spend. ROI focuses on profitability, while ROAS focuses on revenue efficiency.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good marketing ROI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good marketing ROI varies by industry, but generally, a 5:1 ratio (500% ROI) is considered strong, meaning you earn $5 for every $1 spent. The average marketing ROI across industries is around 100-200%. For ROAS, 4:1 or higher is typically considered good, though this depends on your profit margins and business model.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate ROI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ROI is calculated using the formula: (Net Profit / Cost) × 100 = ROI%. For marketing campaigns, this means: (Revenue - Ad Spend - COGS) / Ad Spend × 100. This gives you the percentage return on every dollar invested in advertising.",
          },
        },
        {
          "@type": "Question",
          name: "What timeframe should I measure marketing ROI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The ideal timeframe depends on your business model and sales cycle. For e-commerce and digital products, weekly or monthly analysis is common. For B2B with longer sales cycles, quarterly or annual ROI measurements may be more appropriate. Always account for attribution windows and customer lifetime value when analyzing ROI.",
          },
        },
        {
          "@type": "Question",
          name: "How can I improve my marketing ROI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "To improve ROI: optimize targeting to reach high-intent audiences, improve conversion rates, reduce customer acquisition costs, test different ad creatives and messaging, focus budget on top-performing channels, implement A/B testing, track metrics accurately, and continuously optimize based on data. Using analytics tools helps identify which campaigns generate the best returns.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">Understanding ROI vs ROAS</h2>
    <p className="text-neutral-700 dark:text-neutral-300 mb-6">
      When measuring marketing performance, two key metrics stand out: ROI (Return on Investment) and ROAS (Return on Ad
      Spend). While they sound similar, they measure different aspects of campaign success.
    </p>
    <ul className="space-y-4 text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>ROI (Return on Investment):</strong> Measures profit as a percentage of your investment. Formula:{" "}
        <code>(Revenue - Cost) / Cost × 100</code>. A 200% ROI means you earn $2 in profit for every $1 spent. Focuses
        on profitability and bottom-line impact.
      </li>
      <li>
        <strong>ROAS (Return on Ad Spend):</strong> Measures revenue generated per dollar of ad spend. Formula:{" "}
        <code>Revenue / Ad Spend</code>. A 4:1 ROAS means you generate $4 in revenue for every $1 spent on ads. Focuses
        on revenue generation efficiency.
      </li>
    </ul>

    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Why Marketing ROI Matters</h2>
    <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
      <p>Tracking marketing ROI is essential for sustainable business growth. It helps you:</p>
      <ul className="space-y-3 mt-4">
        <li className="flex gap-3">
          
          <span>
            <strong>Justify marketing budgets</strong> to stakeholders with clear financial metrics
          </span>
        </li>
        <li className="flex gap-3">
          
          <span>
            <strong>Identify top-performing channels</strong> and allocate budget accordingly
          </span>
        </li>
        <li className="flex gap-3">
          
          <span>
            <strong>Reduce wasted ad spend</strong> on underperforming campaigns
          </span>
        </li>
        <li className="flex gap-3">
          
          <span>
            <strong>Optimize customer acquisition costs</strong> across your marketing mix
          </span>
        </li>
        <li className="flex gap-3">
          
          <span>
            <strong>Make data-driven decisions</strong> about marketing strategy and tactics
          </span>
        </li>
      </ul>
    </div>

    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Marketing ROI Formulas</h2>
    <ul className="space-y-3 text-neutral-700 dark:text-neutral-300 mb-4">
      <li>
        <strong>Basic ROI Formula:</strong> <code>ROI = (Net Profit / Investment) × 100</code>
      </li>
      <li>
        <strong>Marketing ROI Formula:</strong> <code>ROI = (Revenue - Ad Spend - COGS) / Ad Spend × 100</code>
      </li>
      <li>
        <strong>ROAS Formula:</strong> <code>ROAS = Total Revenue / Ad Spend</code>
      </li>
      <li>
        <strong>Profit Margin Formula:</strong> <code>Profit Margin = (Net Profit / Revenue) × 100</code>
      </li>
    </ul>
    <p className="text-sm text-neutral-600 dark:text-neutral-400">
      Use our calculator above to apply these formulas instantly. All calculations are performed in real-time as you
      enter your numbers.
    </p>

    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Industry Benchmarks</h2>
    <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
      <p>
        Marketing ROI varies significantly by industry, business model, and campaign type. Here are general benchmarks
        to help you evaluate your performance:
      </p>
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-200 dark:bg-neutral-700">
              <th className="border border-neutral-300 dark:border-neutral-600 p-3 text-left font-semibold">
                Industry
              </th>
              <th className="border border-neutral-300 dark:border-neutral-600 p-3 text-left font-semibold">
                Average ROI
              </th>
              <th className="border border-neutral-300 dark:border-neutral-600 p-3 text-left font-semibold">
                Good ROAS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">E-commerce</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">100-200%</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">3:1 to 5:1</td>
            </tr>
            <tr>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">SaaS</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">200-400%</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">5:1 to 10:1</td>
            </tr>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">B2B Services</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">150-300%</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">3:1 to 6:1</td>
            </tr>
            <tr>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">Lead Generation</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">200-500%</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">4:1 to 8:1</td>
            </tr>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">Digital Services</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">250-400%</td>
              <td className="border border-neutral-300 dark:border-neutral-600 p-3">5:1 to 10:1</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm italic">
        Note: These benchmarks are based on industry averages and can vary significantly based on business model,
        market, and campaign optimization.
      </p>
    </div>

    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Marketing ROI Best Practices</h2>
    <ol className="space-y-3 text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Track All Costs Accurately:</strong> Include ad spend, platform fees, creative production, and overhead
        costs to calculate true ROI.
      </li>
      <li>
        <strong>Define Attribution Windows:</strong> Establish clear timeframes for tracking conversions based on your
        sales cycle and customer behavior.
      </li>
      <li>
        <strong>Segment by Channel and Campaign:</strong> Track ROI separately for different channels, campaigns, and
        customer segments to identify winners.
      </li>
      <li>
        <strong>Account for Customer Lifetime Value:</strong> Consider repeat purchases and long-term customer value
        when evaluating campaign ROI.
      </li>
      <li>
        <strong>Test and Optimize Continuously:</strong> Run A/B tests, analyze performance data, and iterate on
        top-performing elements.
      </li>
      <li>
        <strong>Review Monthly and Adjust:</strong> Monitor ROI trends over time and reallocate budget to
        high-performing campaigns.
      </li>
    </ol>

    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">How to Improve Your Marketing ROI</h2>
    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Acquisition Side</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>Improve targeting accuracy and audience segmentation</li>
      <li>Optimize ad copy and creative performance</li>
      <li>Reduce customer acquisition cost (CAC)</li>
      <li>Test different channels and tactics</li>
      <li>Implement attribution tracking</li>
      <li>Focus on high-intent audiences</li>
    </ul>
    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Conversion Side</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-4">
      <li>Improve website conversion rates</li>
      <li>Optimize landing pages for campaigns</li>
      <li>Streamline checkout and purchase process</li>
      <li>Improve product-market fit</li>
      <li>Increase average order value</li>
      <li>Maximize customer retention</li>
    </ul>
    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-4">
      The most effective approach combines optimization on both sides: reducing costs to acquire customers while
      increasing the revenue they generate.
    </p>
  </>
);

const faqs = [
  {
    question: "What is ROI vs ROAS?",
    answer:
      "ROI (Return on Investment) measures your profit as a percentage of your investment, calculated as (Revenue - Cost) / Cost × 100. ROAS (Return on Ad Spend) measures revenue per dollar spent on advertising, calculated as Revenue / Ad Spend. ROI focuses on profitability, while ROAS focuses on revenue efficiency.",
  },
  {
    question: "What is a good marketing ROI?",
    answer:
      "A good marketing ROI varies by industry, but generally, a 5:1 ratio (500% ROI) is considered strong, meaning you earn $5 for every $1 spent. The average marketing ROI across industries is around 100-200%. For ROAS, 4:1 or higher is typically considered good, though this depends on your profit margins and business model.",
  },
  {
    question: "How do I calculate ROI?",
    answer:
      "ROI is calculated using the formula: (Net Profit / Cost) × 100 = ROI%. For marketing campaigns, this means: (Revenue - Ad Spend - COGS) / Ad Spend × 100. This gives you the percentage return on every dollar invested in advertising. Use our calculator above to compute this automatically.",
  },
  {
    question: "What timeframe should I measure marketing ROI?",
    answer:
      "The ideal timeframe depends on your business model and sales cycle. For e-commerce and digital products, weekly or monthly analysis is common. For B2B with longer sales cycles, quarterly or annual ROI measurements may be more appropriate. Always account for attribution windows and customer lifetime value when analyzing ROI.",
  },
  {
    question: "How can I improve my marketing ROI?",
    answer: (
      <>
        To improve ROI, focus on: targeting high-intent audiences, optimizing conversion rates, reducing customer
        acquisition costs, improving ad creative and messaging, A/B testing campaigns, focusing on high-performing
        channels, and tracking performance with analytics. Use{" "}
        <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit Analytics
        </Link>{" "}
        to identify which campaigns and channels drive the best returns.
      </>
    ),
  },
];

export default function MarketingROICalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="marketing-roi-calculator"
      title="Marketing ROI Calculator"
      description="Calculate ROI, ROAS, and profit margins for your marketing campaigns. Make data-driven decisions about your ad spend."
      badge="Free Tool"
      toolComponent={<MarketingROIForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track your marketing ROI with Rybbit"
      ctaDescription="See which campaigns generate the best ROI and optimize your marketing spend."
      ctaEventLocation="roi_calculator_cta"
      structuredData={structuredData}
    />
  );
}
