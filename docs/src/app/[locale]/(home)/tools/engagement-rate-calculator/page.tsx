import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { EngagementRateForm } from "./EngagementRateForm";

export const metadata: Metadata = {
  title: "Free Engagement Rate Calculator | Rybbit",
  description:
    "Calculate engagement rate by followers, reach, or impressions across social platforms. Add every interaction and get a clear, comparable percentage instantly.",
  openGraph: {
    title: "Free Engagement Rate Calculator",
    description: "Calculate social engagement by followers, reach, or impressions.",
    type: "website",
    url: "https://rybbit.com/tools/engagement-rate-calculator",
    siteName: "Rybbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Engagement Rate Calculator",
    description: "Calculate social engagement by followers, reach, or impressions.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/engagement-rate-calculator",
  },
};

const faqData = [
  {
    question: "How is engagement rate calculated?",
    answer:
      "Add the interactions included in your report, divide that total by followers, reach, or impressions, then multiply by 100. The denominator should match the method you use when comparing results.",
  },
  {
    question: "Should I calculate engagement by followers, reach, or impressions?",
    answer:
      "Use followers for an account-level view, reach to measure actions among unique viewers, and impressions to measure actions across every content view. Reach is often the clearest post-level denominator when it is available.",
  },
  {
    question: "Which interactions should I include?",
    answer:
      "Include the actions relevant to your goal and available consistently in your platform reports, such as likes, comments, shares, saves, and clicks. Keep the same interaction definition when comparing posts or periods.",
  },
  {
    question: "Can an engagement rate be higher than 100%?",
    answer:
      "Yes. A person can perform more than one interaction, and follower-based calculations can include actions from non-followers. A result above 100% is mathematically possible, though it should prompt a check that the numerator and denominator cover the same period.",
  },
  {
    question: "How should I compare engagement across platforms?",
    answer:
      "Use the same denominator and interaction definition for every comparison. Platform metrics are not always equivalent, so compare trends within each platform before treating cross-platform rates as directly interchangeable.",
  },
  {
    question: "Can Rybbit measure engagement after a social click?",
    answer:
      "Yes. Rybbit can track the website sessions, goals, events, and conversions that follow a social visit. That ties platform engagement to real on-site behavior.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Engagement Rate Calculator",
      description: "Calculate social media engagement rate by followers, reach, or impressions.",
      url: "https://rybbit.com/tools/engagement-rate-calculator",
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
    <h2>What is engagement rate?</h2>
    <p>
      Engagement rate shows how often an audience takes action on content relative to the audience that could see it. It
      turns different interaction totals into a percentage that is easier to compare across posts, campaigns, and
      reporting periods.
    </p>

    <h2>Choose a denominator that matches the question</h2>
    <ul>
      <li>
        <strong>Followers</strong> answers how active the account audience is overall.
      </li>
      <li>
        <strong>Reach</strong> answers how many unique viewers interacted with a post.
      </li>
      <li>
        <strong>Impressions</strong> answers how often any recorded view led to an action.
      </li>
    </ul>
    <p>
      The general formula is <code>(total interactions ÷ denominator) × 100</code>. Keep the platform, time period,
      interaction types, and denominator consistent whenever you compare two rates.
    </p>

    <h2>Turn platform attention into website outcomes</h2>
    <p>
      An engagement rate describes activity inside a social platform; it does not show whether those actions produced
      qualified visits or conversions. Tag campaign links consistently, then review on-site events and goals to learn
      which engaged audiences also take valuable actions on your website.
    </p>
  </>
);

export default function EngagementRateCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="engagement-rate-calculator"
      title="Engagement Rate Calculator"
      description="Calculate a consistent social engagement rate using followers, reach, or impressions and the interactions that matter to your report."
      badge="Free Tool"
      toolComponent={<EngagementRateForm />}
      educationalContent={educationalContent}
      faqs={faqData}
      relatedToolsCategory="social-media"
      ctaTitle="See what engaged visitors do next"
      ctaDescription="Use Rybbit to connect campaign traffic with website events, goals, and conversions without adding analytics clutter."
      ctaEventLocation="engagement_rate_calculator_cta"
      structuredData={structuredData}
    />
  );
}
