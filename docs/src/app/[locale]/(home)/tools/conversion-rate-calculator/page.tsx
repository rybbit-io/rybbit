import { ToolPageLayout } from "../components/ToolPageLayout";
import { ConversionRateForm } from "./ConversionRateForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Conversion Rate Calculator | Optimize Your Marketing Funnel",
  description:
    "Calculate conversion rates instantly with our free calculator. Compare against industry benchmarks, identify optimization opportunities, and improve ROI across all channels.",
  openGraph: {
    title: "Free Conversion Rate Calculator",
    description:
      "Calculate and optimize your conversion rates with industry benchmarks",
    type: "website",
    url: "https://rybbit.com/tools/conversion-rate-calculator",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Conversion Rate Calculator",
    description: "Calculate your conversion rate and compare against industry benchmarks",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/conversion-rate-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Conversion Rate Calculator",
      description:
        "Free conversion rate calculator to measure marketing effectiveness and compare against industry benchmarks",
      url: "https://rybbit.com/tools/conversion-rate-calculator",
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
          name: "What is conversion rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Conversion rate is the percentage of visitors who complete a desired action, such as making a purchase or signing up. It's calculated by dividing conversions by total visitors and multiplying by 100.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate conversion rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Conversion Rate = (Total Conversions ÷ Total Visitors) × 100. For example, if you had 10,000 visitors and 235 conversions, your conversion rate would be 2.35%.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good conversion rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good conversion rate varies by industry and traffic source. Overall website averages are around 2.35%, e-commerce is 2.86%, SaaS is 3%, and landing pages average 4.02%. Top performers often achieve 5-10% or higher.",
          },
        },
        {
          "@type": "Question",
          name: "How can I improve my conversion rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Improve conversion rates by optimizing page speed, clarifying your value proposition, simplifying forms, adding social proof, using clear CTAs, A/B testing elements, and improving mobile experience.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
      What is Conversion Rate?
    </h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Conversion rate is the percentage of visitors who complete a desired action on your
      website or landing page. This could be making a purchase, signing up for a newsletter,
      downloading a resource, or any other goal that moves prospects through your marketing
      funnel.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
      It's one of the most critical metrics in digital marketing because it directly measures
      how effectively you turn traffic into valuable outcomes. Even small improvements in
      conversion rate can significantly impact revenue and ROI.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
      How to Calculate Conversion Rate
    </h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          Conversion Rate = (Conversions ÷ Visitors) × 100
        </div>
      </div>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong>Example:</strong> If you had 10,000 visitors and 235 conversions:
        </p>
        <p className="text-center font-mono">
          Conversion Rate = (235 ÷ 10,000) × 100 = 2.35%
        </p>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
      Industry Benchmarks by Source
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">
          By Industry
        </h4>
        <ul className="space-y-2">
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Landing Pages:</strong> 4.02%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>SaaS:</strong> 3.0%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>E-commerce:</strong> 2.86%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Overall Website:</strong> 2.35%
          </li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">
          By Traffic Source
        </h4>
        <ul className="space-y-2">
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Paid Search:</strong> 3.75%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Email Campaigns:</strong> 3.2%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Organic Search:</strong> 2.4%
          </li>
          <li className="text-neutral-700 dark:text-neutral-300">
            <strong>Display Ads:</strong> 0.77%
          </li>
        </ul>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
      Why Conversion Rate Matters
    </h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Maximize ROI:</strong> Get more value from existing traffic without
        increasing ad spend
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Identify issues:</strong> Low conversion rates signal problems with user
        experience or messaging
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Benchmark performance:</strong> Compare effectiveness across channels and
        campaigns
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Guide optimization:</strong> Focus efforts on high-impact improvements
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
      How to Improve Your Conversion Rate
    </h3>
    <ol className="space-y-3 mb-6 list-decimal list-inside text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Optimize page speed:</strong> Every second of load time reduces conversions by
        7%
      </li>
      <li>
        <strong>Clarify value proposition:</strong> Make benefits immediately clear and
        compelling
      </li>
      <li>
        <strong>Simplify forms:</strong> Only ask for essential information to reduce friction
      </li>
      <li>
        <strong>Add social proof:</strong> Include testimonials, reviews, and trust badges
      </li>
      <li>
        <strong>Use clear CTAs:</strong> Make call-to-action buttons prominent and
        action-oriented
      </li>
      <li>
        <strong>A/B test elements:</strong> Continuously test headlines, images, copy, and
        layouts
      </li>
      <li>
        <strong>Improve mobile experience:</strong> Ensure responsive design and fast mobile
        load times
      </li>
      <li>
        <strong>Remove distractions:</strong> Eliminate unnecessary navigation and competing
        calls-to-action
      </li>
    </ol>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
      Micro vs Macro Conversions
    </h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Understanding different conversion types helps optimize the entire funnel:
    </p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Macro conversions:</strong> Primary goals like purchases, subscriptions, or
        qualified leads
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Micro conversions:</strong> Smaller actions like email sign-ups, content
        downloads, or video views that indicate progress
      </li>
    </ul>
  </>
);

const faqs = [
  {
    question: "What is conversion rate?",
    answer:
      "Conversion rate is the percentage of visitors who complete a desired action, such as making a purchase, signing up for a newsletter, or downloading a resource. It's calculated by dividing the number of conversions by total visitors and multiplying by 100.",
  },
  {
    question: "How do I calculate conversion rate?",
    answer:
      "Conversion Rate = (Total Conversions ÷ Total Visitors) × 100. For example, if you had 10,000 visitors and 235 conversions, your conversion rate would be 2.35%.",
  },
  {
    question: "What is a good conversion rate?",
    answer:
      "A good conversion rate varies by industry and traffic source. Overall website averages are around 2.35%, e-commerce is 2.86%, SaaS is 3%, and landing pages average 4.02%. Top-performing pages often achieve 5-10% or higher. The key is to continuously improve your own baseline.",
  },
  {
    question: "How is conversion rate different from click-through rate?",
    answer: (
      <>
        Click-through rate (CTR) measures the percentage of people who click on an ad or link,
        while conversion rate measures the percentage who complete a desired action after
        clicking. CTR measures initial engagement, while conversion rate measures final
        outcomes. Calculate your{" "}
        <Link
          href="/tools/ctr-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          CTR here
        </Link>
        .
      </>
    ),
  },
  {
    question: "How can I improve my conversion rate?",
    answer:
      "Improve conversion rates by optimizing page speed, clarifying your value proposition, simplifying forms, adding social proof (testimonials, reviews), using clear and prominent CTAs, A/B testing different elements, improving mobile experience, and removing unnecessary distractions.",
  },
  {
    question: "What's the relationship between conversion rate and cost per acquisition?",
    answer: (
      <>
        Conversion rate and CPA are inversely related. Higher conversion rates typically lead
        to lower cost per acquisition because you're converting more of your existing traffic.
        A 1% improvement in conversion rate can significantly reduce your{" "}
        <Link
          href="/tools/cost-per-acquisition-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          cost per acquisition
        </Link>
        .
      </>
    ),
  },
];

export default function ConversionRatePage() {
  return (
    <ToolPageLayout
      toolSlug="conversion-rate-calculator"
      title="Conversion Rate Calculator"
      description="Calculate conversion rates and compare against industry benchmarks to optimize your marketing funnel and maximize ROI"
      badge="Free Tool"
      toolComponent={<ConversionRateForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track conversion rates with Rybbit"
      ctaDescription="Monitor conversion rates across pages, campaigns, and channels in real-time with Rybbit's analytics platform."
      ctaEventLocation="conversion_rate_calculator_cta"
      structuredData={structuredData}
    />
  );
}
