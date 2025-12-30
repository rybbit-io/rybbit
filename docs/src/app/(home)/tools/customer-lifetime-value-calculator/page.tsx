import { ToolPageLayout } from "../components/ToolPageLayout";
import { CustomerLifetimeValueForm } from "./CustomerLifetimeValueForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Customer Lifetime Value (CLV) Calculator | Predict Revenue Per Customer",
  description:
    "Calculate customer lifetime value with our advanced CLV calculator. Include retention rates, profit margins, and compare against industry benchmarks to optimize customer acquisition.",
  openGraph: {
    title: "Free Customer Lifetime Value (CLV) Calculator",
    description: "Calculate CLV with retention rates and profit margins, compare against industry benchmarks",
    type: "website",
    url: "https://rybbit.com/tools/customer-lifetime-value-calculator",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free CLV Calculator",
    description: "Calculate customer lifetime value with retention rate analysis",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/customer-lifetime-value-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Customer Lifetime Value Calculator",
      description:
        "Free CLV calculator with retention rate analysis to predict customer revenue and compare against industry benchmarks",
      url: "https://rybbit.com/tools/customer-lifetime-value-calculator",
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
          name: "What is Customer Lifetime Value (CLV)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Customer Lifetime Value (CLV) is the total revenue a business can expect from a single customer over the entire duration of their relationship. It helps businesses determine how much to invest in customer acquisition and retention.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate CLV?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CLV = (Average Purchase Value × Purchase Frequency × Customer Lifespan × Profit Margin) × Retention Factor. For example, if a customer spends $100 per purchase, buys 12 times per year, stays for 3 years, with a 20% margin and 85% retention, the CLV would be calculated using these values.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good CLV?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good CLV varies by industry. SaaS averages $1,200, e-commerce $168, financial services $5,000, and insurance $7,200. More importantly, your CLV should be at least 3x your Customer Acquisition Cost (CAC) for sustainable growth.",
          },
        },
        {
          "@type": "Question",
          name: "How can I increase CLV?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Increase CLV by improving retention rates, increasing purchase frequency through upsells and cross-sells, raising average order values, extending customer lifespans, and improving profit margins through operational efficiency.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What is Customer Lifetime Value (CLV)?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Customer Lifetime Value (CLV or LTV) represents the total revenue a business can reasonably expect from a single
      customer account throughout their entire relationship. It's one of the most important metrics for understanding
      profitability and guiding strategic decisions around customer acquisition and retention.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
      By understanding CLV, businesses can determine how much they should invest to acquire new customers, which
      customer segments are most valuable, and where to focus retention efforts for maximum ROI.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Calculate CLV</h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <div className="text-center mb-4">
        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
          CLV = (Avg Purchase Value × Purchase Frequency × Customer Lifespan × Profit Margin) × Retention Factor
        </div>
      </div>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong>Where:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Avg Purchase Value = Average amount per transaction</li>
          <li>Purchase Frequency = Number of purchases per year</li>
          <li>Customer Lifespan = Average years as a customer</li>
          <li>Profit Margin = Percentage of revenue retained as profit</li>
          <li>Retention Factor = Adjustment based on retention rate (1 ÷ (1 - Retention%))</li>
        </ul>
        <p className="pt-2">
          <strong>Example:</strong> $100 avg purchase × 12 purchases/year × 3 years × 20% margin × 1.18 retention factor
          = ~$850 CLV
        </p>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Industry Benchmarks</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Insurance:</strong> $7,200 average CLV
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Financial Services:</strong> $5,000 average CLV
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Telecommunications:</strong> $3,600 average CLV
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Fitness/Gym:</strong> $1,800 average CLV
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>SaaS:</strong> $1,200 average CLV
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Streaming Services:</strong> $850 average CLV
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Subscription Box:</strong> $420 average CLV
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>E-commerce:</strong> $168 average CLV
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Why CLV Matters</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Inform acquisition spending:</strong> Determines how much you can afford to spend on customer
        acquisition
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Identify valuable segments:</strong> Shows which customer types are most profitable
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Prioritize retention:</strong> Highlights the value of keeping existing customers
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Forecast revenue:</strong> Helps predict long-term revenue and business health
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">The CLV:CAC Ratio</h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      One of the most critical business metrics is the ratio between Customer Lifetime Value and Customer Acquisition
      Cost (CAC):
    </p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CLV:CAC &lt; 1:</strong> You're losing money on every customer (unsustainable)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CLV:CAC = 1-3:</strong> Marginal profitability (risky)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CLV:CAC = 3-4:</strong> Healthy and sustainable business model (ideal)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CLV:CAC &gt; 4:</strong> Possibly under-investing in growth opportunities
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Increase CLV</h3>
    <ol className="space-y-3 mb-6 list-decimal list-inside text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Improve retention rates:</strong> Reduce churn through better onboarding, support, and engagement
      </li>
      <li>
        <strong>Increase purchase frequency:</strong> Implement subscription models, loyalty programs, and regular
        communication
      </li>
      <li>
        <strong>Raise average order value:</strong> Use upselling, cross-selling, and bundling strategies
      </li>
      <li>
        <strong>Extend customer lifespan:</strong> Build strong relationships and continuously deliver value
      </li>
      <li>
        <strong>Optimize profit margins:</strong> Improve operational efficiency and reduce cost of goods sold
      </li>
      <li>
        <strong>Focus on high-value segments:</strong> Invest more in acquiring and retaining your most profitable
        customers
      </li>
    </ol>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Simple vs Advanced CLV Models</h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      There are different approaches to calculating CLV:
    </p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Simple CLV:</strong> Average purchase value × purchase frequency × customer lifespan (quick estimate)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Advanced CLV:</strong> Includes profit margins, retention rates, and discount rates (more accurate)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Predictive CLV:</strong> Uses machine learning to predict future value based on behavior patterns
      </li>
    </ul>
  </>
);

const faqs = [
  {
    question: "What is Customer Lifetime Value (CLV)?",
    answer:
      "Customer Lifetime Value (CLV or LTV) is the total revenue a business can expect from a single customer over the entire duration of their relationship. It helps businesses determine how much to invest in customer acquisition and retention strategies.",
  },
  {
    question: "How do I calculate CLV?",
    answer:
      "CLV = (Average Purchase Value × Purchase Frequency × Customer Lifespan × Profit Margin) × Retention Factor. The retention factor is calculated as 1 ÷ (1 - Retention Rate) to account for customer churn and loyalty.",
  },
  {
    question: "What is a good CLV?",
    answer:
      "A good CLV varies by industry. SaaS averages $1,200, e-commerce $168, financial services $5,000, and insurance $7,200. More importantly, your CLV should be at least 3x your Customer Acquisition Cost (CAC) for sustainable, profitable growth.",
  },
  {
    question: "What's the difference between CLV and LTV?",
    answer:
      "CLV (Customer Lifetime Value) and LTV (Lifetime Value) are the same metric with different acronyms. Both measure the total value a customer brings to your business over their entire relationship. The terms are used interchangeably.",
  },
  {
    question: "How can I increase my CLV?",
    answer:
      "Increase CLV by improving retention rates (reduce churn), increasing purchase frequency through upsells and cross-sells, raising average order values, extending customer lifespans through better relationships, and improving profit margins through operational efficiency.",
  },
  {
    question: "What is the CLV:CAC ratio and why does it matter?",
    answer: (
      <>
        The CLV:CAC ratio compares Customer Lifetime Value to{" "}
        <Link
          href="/tools/cost-per-acquisition-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Customer Acquisition Cost
        </Link>
        . A healthy ratio is 3:1 or higher, meaning each customer generates at least 3x what you spent to acquire them.
        Ratios below 3:1 indicate unsustainable unit economics.
      </>
    ),
  },
];

export default function CustomerLifetimeValuePage() {
  return (
    <ToolPageLayout
      toolSlug="customer-lifetime-value-calculator"
      title="Customer Lifetime Value (CLV) Calculator"
      description="Calculate customer lifetime value with retention analysis and profit margins to optimize acquisition spending and maximize long-term revenue"
      badge="Free Tool"
      toolComponent={<CustomerLifetimeValueForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track CLV and customer metrics with Rybbit"
      ctaDescription="Monitor customer lifetime value, retention cohorts, and revenue trends in real-time with Rybbit's analytics platform."
      ctaEventLocation="customer_lifetime_value_calculator_cta"
      structuredData={structuredData}
    />
  );
}
