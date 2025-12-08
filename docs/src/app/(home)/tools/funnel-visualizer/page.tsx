import { FunnelVisualizerForm } from "./FunnelVisualizerForm";
import { ToolPageLayout } from "../components/ToolPageLayout";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Funnel Visualizer | Marketing Funnel Analysis & Conversion Funnel Tool",
  description:
    "Visualize your conversion funnel step-by-step. Input visitor counts at each stage to identify where you're losing customers. Analyze drop-off rates and optimize your funnel for better conversions.",
  openGraph: {
    title: "Free Funnel Visualizer | Marketing Funnel Analysis & Conversion Funnel Tool",
    description:
      "Visualize your conversion funnel step-by-step. Identify drop-off points and optimize conversion rates.",
    type: "website",
    url: "https://rybbit.com/tools/funnel-visualizer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Funnel Visualizer | Marketing Funnel Analysis & Conversion Funnel Tool",
    description:
      "Visualize your conversion funnel step-by-step. Identify drop-off points and optimize conversion rates.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/funnel-visualizer",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Funnel Visualizer",
      description: "Free tool to visualize conversion funnels and analyze drop-off rates at each step",
      url: "https://rybbit.com/tools/funnel-visualizer",
      applicationCategory: "BusinessApplication",
      featureList: [
        "Step-by-step funnel visualization",
        "Conversion rate analysis",
        "Drop-off rate tracking",
        "Customizable funnel stages",
        "Real-time calculations",
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
          name: "What is a conversion funnel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A conversion funnel is the path visitors take from initial contact to conversion. It shows how many users progress through each step and where they drop off. Understanding your funnel helps identify friction points and optimization opportunities.",
          },
        },
        {
          "@type": "Question",
          name: "What are the typical stages in a conversion funnel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Common funnel stages include: Awareness (landing page visits), Consideration (product/service page views), Evaluation (cart additions), Decision (checkout starts), and Conversion (purchases). However, funnels vary by business model. E-commerce might track store browsing to purchase, while SaaS might track sign-ups to trial to paid conversion.",
          },
        },
        {
          "@type": "Question",
          name: "How do I analyze funnel drop-offs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "To analyze drop-offs: (1) Calculate the percentage drop from each step to the next, (2) Identify which steps have the largest losses, (3) Consider external factors (traffic quality, targeting, seasonality), (4) Test improvements on high-drop-off steps, (5) Compare performance over time. The steps with the biggest drop-offs typically offer the best optimization opportunities.",
          },
        },
        {
          "@type": "Question",
          name: "What is a good conversion funnel rate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Conversion rates vary widely by industry and business model. E-commerce websites typically see 2-5% overall conversion rates, SaaS free-to-paid conversion is often 5-15%, while lead generation funnels might convert 10-30% of visitors. The key is to compare your metrics against your own baseline and industry benchmarks, then focus on improving the weakest steps.",
          },
        },
        {
          "@type": "Question",
          name: "How can I improve my conversion funnel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Optimize high drop-off steps first by: simplifying forms and checkout processes, improving page load speed, enhancing trust signals and social proof, clarifying value propositions, reducing friction (fewer clicks), improving mobile experience, A/B testing changes, and removing distractions. Track these improvements with Rybbit Analytics to measure the actual impact on conversions.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What is a Conversion Funnel?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      A conversion funnel visualizes the customer journey from initial awareness to final conversion. Just like a
      physical funnel narrows toward the bottom, a conversion funnel shows how the number of users decreases at each
      step of your sales or signup process.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Understanding your conversion funnel is critical for business growth because it reveals where potential customers
      are dropping off. By identifying and fixing these bottlenecks, you can significantly improve your overall
      conversion rate without increasing marketing spend.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Why Funnels Matter</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>Reveal exactly where customers are leaving</li>
      <li>Help prioritize optimization efforts on high-impact areas</li>
      <li>Enable data-driven decision making about your funnel</li>
      <li>Track progress as you implement improvements</li>
      <li>Support ROI calculations for marketing initiatives</li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Understanding Funnel Stages</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      While funnels vary by business model, most follow a similar progression from awareness to conversion. Here are the
      common stages:
    </p>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Awareness:</strong> Users discover your brand through ads, content, or word-of-mouth. This is typically
        measured by landing page visits or impressions.
      </li>
      <li>
        <strong>Consideration:</strong> Interested users explore your product or service by viewing product pages,
        demos, or reading reviews.
      </li>
      <li>
        <strong>Evaluation:</strong> Users actively consider the purchase by adding items to cart, requesting quotes, or
        starting free trials.
      </li>
      <li>
        <strong>Decision:</strong> Users commit to action by starting checkout, completing signup forms, or requesting
        more information.
      </li>
      <li>
        <strong>Conversion:</strong> Users complete the desired action—purchase, signup, trial activation, or lead
        submission.
      </li>
      <li>
        <strong>Retention:</strong> Users continue engaging (repeat purchases, retention rate, customer lifetime value).
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">How to Analyze Funnel Drop-offs</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Drop-offs occur when users don't progress to the next step. Analyzing where and why users drop off is the key to
      optimization. Here's a systematic approach:
    </p>
    <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Calculate Drop-off Percentages:</strong> For each step, calculate what percentage of users from the
        previous step dropped off. A 50% drop from step 1 to 2 is a major red flag.
      </li>
      <li>
        <strong>Identify the Biggest Bottleneck:</strong> Focus on the step with the largest absolute drop (most users
        lost). This is usually your highest-impact optimization opportunity.
      </li>
      <li>
        <strong>Consider External Factors:</strong> Evaluate traffic quality, targeting, seasonality, device type, and
        traffic source. High drop-offs might indicate poor audience match, not a product issue.
      </li>
      <li>
        <strong>Hypothesize Root Causes:</strong> Use analytics, user testing, surveys, and session recordings to
        understand why users drop off. Is it friction, unclear messaging, trust issues, or pricing?
      </li>
      <li>
        <strong>Test Improvements:</strong> Implement targeted fixes (form simplification, page speed improvements,
        clearer CTAs) and measure the impact on your funnel conversion rate.
      </li>
    </ol>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Funnel Optimization Strategies</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Once you've identified drop-off points, here are proven strategies to improve each stage of your funnel:
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Awareness Stage</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>Target high-intent keywords and audiences</li>
      <li>Improve ad creative and messaging relevance</li>
      <li>Ensure traffic sources align with audience quality</li>
      <li>Test different channel mix</li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Consideration Stage</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>Improve page load speed</li>
      <li>Clarify value proposition above the fold</li>
      <li>Add product images, videos, and demos</li>
      <li>Include social proof and testimonials</li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Evaluation Stage</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>Make pricing transparent and competitive</li>
      <li>Add comparison tables and ROI calculators</li>
      <li>Offer risk-free trials or guarantees</li>
      <li>Provide detailed feature documentation</li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Decision Stage</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>Simplify checkout (fewer form fields)</li>
      <li>Show security badges and trust signals</li>
      <li>Offer multiple payment options</li>
      <li>Reduce required steps to purchase</li>
    </ul>
  </>
);

const faqs = [
  {
    question: "What is a conversion funnel?",
    answer:
      "A conversion funnel is the path visitors take from initial contact to conversion. It shows how many users progress through each step and where they drop off. Understanding your funnel helps identify friction points and optimization opportunities.",
  },
  {
    question: "What are the typical stages in a conversion funnel?",
    answer:
      "Common funnel stages include: Awareness (landing page visits), Consideration (product/service page views), Evaluation (cart additions), Decision (checkout starts), and Conversion (purchases). However, funnels vary by business model. E-commerce might track store browsing to purchase, while SaaS might track sign-ups to trial to paid conversion.",
  },
  {
    question: "How do I analyze funnel drop-offs?",
    answer:
      "To analyze drop-offs: (1) Calculate the percentage drop from each step to the next, (2) Identify which steps have the largest losses, (3) Consider external factors (traffic quality, targeting, seasonality), (4) Test improvements on high-drop-off steps, (5) Compare performance over time. The steps with the biggest drop-offs typically offer the best optimization opportunities.",
  },
  {
    question: "What is a good conversion funnel rate?",
    answer:
      "Conversion rates vary widely by industry and business model. E-commerce websites typically see 2-5% overall conversion rates, SaaS free-to-paid conversion is often 5-15%, while lead generation funnels might convert 10-30% of visitors. The key is to compare your metrics against your own baseline and industry benchmarks, then focus on improving the weakest steps.",
  },
  {
    question: "How can I improve my conversion funnel?",
    answer: (
      <>
        Optimize high drop-off steps first by: simplifying forms and checkout processes, improving page load speed,
        enhancing trust signals and social proof, clarifying value propositions, reducing friction (fewer clicks),
        improving mobile experience, A/B testing changes, and removing distractions. Track these improvements with{" "}
        <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit Analytics
        </Link>{" "}
        to measure the actual impact on conversions.
      </>
    ),
  },
];

export default function FunnelVisualizerPage() {
  return (
    <ToolPageLayout
      toolSlug="funnel-visualizer"
      title="Funnel Visualizer"
      description="Visualize your conversion funnel step-by-step. Input visitor counts at each stage and see where you're losing customers. Analyze drop-off rates and identify optimization opportunities."
      badge="Free Tool"
      toolComponent={<FunnelVisualizerForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track funnels automatically with Rybbit"
      ctaDescription="No manual data entry—Rybbit automatically tracks conversion funnels with real-time session data."
      ctaEventLocation="funnel_visualizer_cta"
      structuredData={structuredData}
    />
  );
}
