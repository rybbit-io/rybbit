import { ToolPageLayout } from "../components/ToolPageLayout";
import { RetentionRateForm } from "./RetentionRateForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Retention Rate Calculator | Measure Customer Loyalty & Churn",
  description:
    "Calculate customer retention rate instantly with our free calculator. Compare against industry benchmarks, identify churn patterns, and improve customer loyalty.",
  openGraph: {
    title: "Free Retention Rate Calculator",
    description: "Calculate and optimize your customer retention with industry benchmarks",
    type: "website",
    url: "https://rybbit.com/tools/retention-rate-calculator",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Retention Rate Calculator",
    description: "Calculate your retention rate and compare against industry benchmarks",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/retention-rate-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Retention Rate Calculator",
      description: "Free retention rate calculator to measure customer loyalty and compare against industry benchmarks",
      url: "https://rybbit.com/tools/retention-rate-calculator",
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
          name: "What is retention rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Retention rate measures the percentage of customers who remain customers over a specific period. It's calculated by dividing retained customers by starting customers and multiplying by 100.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate retention rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Retention Rate = ((Customers at End - New Customers) ÷ Customers at Start) × 100. For example, if you started with 1,000 customers, ended with 920, and acquired 150 new ones, your retention rate would be 77%.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good retention rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good retention rate varies by industry. SaaS companies average 93% monthly and 35% annually, while e-commerce sees 38% monthly retention. Higher retention rates indicate better customer satisfaction and product-market fit.",
          },
        },
        {
          "@type": "Question",
          name: "How can I improve retention rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Improve retention by enhancing onboarding, providing excellent customer support, delivering consistent value, engaging customers regularly, gathering and acting on feedback, and implementing loyalty programs.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What is Retention Rate?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Retention rate measures the percentage of customers who continue doing business with you over a specific period.
      It's one of the most important metrics for understanding customer loyalty, product-market fit, and long-term
      business sustainability.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
      High retention rates indicate satisfied customers who find ongoing value in your product or service, while low
      retention signals potential issues with product quality, customer experience, or value proposition.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Calculate Retention Rate</h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          Retention Rate = ((E - N) ÷ S) × 100
        </div>
      </div>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong>Where:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>E = Customers at end of period</li>
          <li>N = New customers acquired during period</li>
          <li>S = Customers at start of period</li>
        </ul>
        <p className="pt-2">
          <strong>Example:</strong> If you started with 1,000 customers, ended with 920, and acquired 150 new customers:
        </p>
        <p className="text-center font-mono">Retention Rate = ((920 - 150) ÷ 1,000) × 100 = 77%</p>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Industry Benchmarks</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Monthly Retention</h4>
        <ul className="space-y-2">
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Telecom:</strong> 97%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Financial Services:</strong> 95%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>SaaS:</strong> 93%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Media/Publishing:</strong> 84%
          </li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Annual Retention</h4>
        <ul className="space-y-2">
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Telecom:</strong> 78%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Financial Services:</strong> 75%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Media/Publishing:</strong> 55%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>SaaS:</strong> 35%
          </li>
        </ul>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Why Retention Rate Matters</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Cost efficiency:</strong> Retaining customers is 5-25x cheaper than acquiring new ones
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Revenue predictability:</strong> High retention creates stable, recurring revenue streams
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Growth indicator:</strong> Shows product-market fit and customer satisfaction
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Compounding value:</strong> Retained customers often increase spending over time
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Improve Retention Rate</h3>
    <ol className="space-y-3 mb-6 list-decimal list-inside text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Enhance onboarding:</strong> Create smooth, guided experiences that help customers realize value quickly
      </li>
      <li>
        <strong>Provide excellent support:</strong> Respond quickly to issues and proactively help customers succeed
      </li>
      <li>
        <strong>Deliver consistent value:</strong> Continuously improve your product and communicate new features
      </li>
      <li>
        <strong>Engage regularly:</strong> Maintain communication through email, in-app messaging, and content
      </li>
      <li>
        <strong>Gather feedback:</strong> Understand why customers leave and address common pain points
      </li>
      <li>
        <strong>Build loyalty programs:</strong> Reward long-term customers with special perks and recognition
      </li>
    </ol>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Retention vs Churn</h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Retention rate and churn rate are inverse metrics that sum to 100%. If your retention rate is 77%, your churn rate
      is 23%. Both metrics provide valuable insights:
    </p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Retention rate:</strong> Focuses on customers who stay (positive framing)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Churn rate:</strong> Highlights customers lost (helps identify problems)
      </li>
    </ul>
  </>
);

const faqs = [
  {
    question: "What is retention rate?",
    answer:
      "Retention rate measures the percentage of customers who remain customers over a specific period. It's calculated by dividing retained customers (excluding new acquisitions) by starting customers and multiplying by 100.",
  },
  {
    question: "How do I calculate retention rate?",
    answer:
      "Retention Rate = ((Customers at End - New Customers) ÷ Customers at Start) × 100. For example, if you started with 1,000 customers, ended with 920, and acquired 150 new ones, your retention rate would be 77%.",
  },
  {
    question: "What is a good retention rate?",
    answer:
      "A good retention rate varies by industry and time period. SaaS companies average 93% monthly and 35% annually, while e-commerce sees 38% monthly retention. Generally, higher is better, with 90%+ monthly retention considered excellent for subscription businesses.",
  },
  {
    question: "What's the difference between retention rate and churn rate?",
    answer:
      "Retention rate measures the percentage of customers who stay, while churn rate measures the percentage who leave. They're inverse metrics that sum to 100%. If retention is 77%, churn is 23%. Retention focuses on the positive (customers kept), while churn highlights the negative (customers lost).",
  },
  {
    question: "How can I improve my retention rate?",
    answer:
      "Improve retention by enhancing onboarding experiences, providing excellent customer support, delivering consistent value, engaging customers regularly through multiple channels, gathering and acting on feedback, and implementing loyalty programs or incentives for long-term customers.",
  },
  {
    question: "Why is retention rate more important than acquisition?",
    answer: (
      <>
        Retaining existing customers is typically 5-25x cheaper than acquiring new ones. High retention also increases{" "}
        <Link
          href="/tools/customer-lifetime-value-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          customer lifetime value
        </Link>
        , creates predictable revenue, and indicates strong product-market fit. A 5% increase in retention can increase
        profits by 25-95%.
      </>
    ),
  },
];

export default function RetentionRatePage() {
  return (
    <ToolPageLayout
      toolSlug="retention-rate-calculator"
      title="Retention Rate Calculator"
      description="Calculate customer retention rates and compare against industry benchmarks to improve customer loyalty and reduce churn"
      badge="Free Tool"
      toolComponent={<RetentionRateForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track retention metrics with Rybbit"
      ctaDescription="Monitor retention rates, churn patterns, and customer behavior in real-time with Rybbit's analytics platform."
      ctaEventLocation="retention_rate_calculator_cta"
      structuredData={structuredData}
    />
  );
}
