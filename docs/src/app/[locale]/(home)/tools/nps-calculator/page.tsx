import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { NPSCalculatorForm } from "./NPSCalculatorForm";

export const metadata: Metadata = {
  title: "Free NPS Calculator | Net Promoter Score",
  description:
    "Calculate Net Promoter Score from promoter, passive, and detractor survey responses. See each group's share and understand the NPS formula right away.",
  openGraph: {
    title: "Free NPS Calculator | Net Promoter Score",
    description: "Calculate NPS from promoter, passive, and detractor response counts in seconds.",
    type: "website",
    url: "https://rybbit.com/tools/nps-calculator",
    siteName: "Rybbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free NPS Calculator | Net Promoter Score",
    description: "Calculate NPS from your survey response counts and see the full response mix.",
  },
  alternates: { canonical: "https://rybbit.com/tools/nps-calculator" },
};

const faqs = [
  {
    question: "How is NPS calculated?",
    answer:
      "Group 9–10 ratings as promoters, 7–8 as passives, and 0–6 as detractors. Subtract the percentage of detractors from the percentage of promoters. Passives count toward the total response count but are not directly subtracted or added.",
  },
  {
    question: "Why does NPS range from -100 to 100?",
    answer:
      "If every respondent is a detractor, the score is -100. If every respondent is a promoter, the score is 100. A score of zero means the promoter and detractor shares are equal.",
  },
  {
    question: "Do passive responses affect NPS?",
    answer:
      "Yes. Passives are included in the total number of responses, so they affect the percentages of promoters and detractors. They do not have their own positive or negative term in the final subtraction.",
  },
  {
    question: "What is a good NPS?",
    answer:
      "The most useful comparison is usually your own score over time and across consistent customer segments. Industry, audience, survey timing, and collection method can all change the result, so generic benchmarks need context.",
  },
  {
    question: "How often should I measure NPS?",
    answer:
      "Use a cadence that matches how often customers meaningfully experience your product, such as after onboarding, after support interactions, or during a periodic relationship survey. Keep the question and sampling method consistent when comparing trends.",
  },
  {
    question: "Can Rybbit help explain a change in NPS?",
    answer:
      "Rybbit does not collect NPS responses by default, but its privacy-friendly web analytics can help you compare product journeys, conversions, and behavior around the periods or segments where your survey score changed.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "NPS Calculator",
      description: "A free calculator for Net Promoter Score and survey response shares.",
      url: "https://rybbit.com/tools/nps-calculator",
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
    <h2>What is Net Promoter Score?</h2>
    <p>
      Net Promoter Score, or NPS, summarizes how likely surveyed customers are to recommend a product, service, or
      company. Respondents answer on a scale from zero to ten and are grouped into promoters, passives, and detractors.
      The final score is a directional relationship metric, not a percentage of satisfied customers.
    </p>

    <h2>How to calculate NPS</h2>
    <p>
      Use <code>NPS = % promoters − % detractors</code>. Count every response in the denominator, including passives.
      For example, 60 promoters, 25 passives, and 15 detractors produce an NPS of 45 because 60% minus 15% equals 45.
    </p>
    <ol>
      <li>Count ratings of 9–10 as promoters.</li>
      <li>Count ratings of 7–8 as passives.</li>
      <li>Count ratings of 0–6 as detractors.</li>
      <li>
        Divide each group by total responses, then subtract the detractor percentage from the promoter percentage.
      </li>
    </ol>

    <h2>How to interpret the result</h2>
    <p>
      A positive score means promoters outnumber detractors; a negative score means the opposite. The number becomes
      more useful when you follow its movement over time, retain a consistent survey method, and compare similar
      customer groups. Pair the score with open-text feedback to learn why respondents chose their rating.
    </p>

    <h2>Survey practices that protect signal quality</h2>
    <ul>
      <li>Use the same wording, channel, audience, and timing when comparing periods.</li>
      <li>Avoid surveying only the most active or successful customers.</li>
      <li>Track response count and rate so a small sample is not mistaken for a broad trend.</li>
      <li>Segment carefully, but do not overinterpret groups with very few responses.</li>
      <li>Connect rating changes with qualitative feedback and behavioral data before acting.</li>
    </ul>
  </>
);

export default function NPSCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="nps-calculator"
      title="NPS Calculator"
      description="Turn promoter, passive, and detractor counts into a clear Net Promoter Score and response mix."
      toolComponent={<NPSCalculatorForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Connect customer sentiment with product behavior"
      ctaDescription="Use privacy-friendly analytics to understand the journeys behind customer feedback."
      ctaEventLocation="nps_calculator_cta"
      structuredData={structuredData}
    />
  );
}
