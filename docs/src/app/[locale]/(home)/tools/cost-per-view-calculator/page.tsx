import { ToolPageLayout } from "../components/ToolPageLayout";
import { CostPerViewForm } from "./CostPerViewForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Cost Per View (CPV) Calculator | Video Advertising ROI",
  description:
    "Calculate cost per view for video ads instantly with our free CPV calculator. Compare across platforms, optimize video ad spend, and improve engagement.",
  openGraph: {
    title: "Free Cost Per View (CPV) Calculator",
    description: "Calculate and optimize your video advertising CPV with platform-specific benchmarks",
    type: "website",
    url: "https://rybbit.com/tools/cost-per-view-calculator",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free CPV Calculator",
    description: "Calculate your cost per view and compare against platform benchmarks",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/cost-per-view-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Cost Per View Calculator",
      description: "Free CPV calculator to measure video advertising costs and compare against platform benchmarks",
      url: "https://rybbit.com/tools/cost-per-view-calculator",
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
          name: "What is Cost Per View (CPV)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cost Per View (CPV) is the amount you pay each time someone views your video ad. It's calculated by dividing total video ad spend by the number of views received.",
          },
        },
        {
          "@type": "Question",
          name: "How do I calculate CPV?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CPV = Total Ad Spend ÷ Total Video Views. For example, if you spent $1,000 and received 15,000 views, your CPV would be $0.067 (6.7 cents per view).",
          },
        },
        {
          "@type": "Question",
          name: "What is a good CPV?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good CPV varies by platform. Facebook Video averages $0.02, YouTube $0.06, Instagram Video $0.05, and TikTok $0.07. Lower CPV indicates more cost-efficient video advertising.",
          },
        },
        {
          "@type": "Question",
          name: "How can I lower my CPV?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Lower CPV by creating more engaging video content, improving targeting, optimizing video length, testing different formats, and choosing cost-effective platforms for your audience.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What is Cost Per View (CPV)?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Cost Per View (CPV) is a video advertising metric that measures how much you pay each time someone views your
      video ad. It's the primary pricing model for video advertising campaigns on platforms like YouTube, Facebook,
      TikTok, and other social media networks.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
      Understanding CPV is essential for evaluating video ad campaign efficiency, comparing platform performance, and
      optimizing your video marketing budget. Unlike impressions (which count displays), views indicate actual
      engagement with your video content.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Calculate CPV</h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          CPV = Total Ad Spend ÷ Total Video Views
        </div>
      </div>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong>Example:</strong> If you spent $1,000 and received 15,000 video views:
        </p>
        <p className="text-center font-mono">CPV = $1,000 ÷ 15,000 = $0.067 (6.7 cents per view)</p>
      </div>
    </div>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Platform Benchmarks</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Facebook Video:</strong> $0.02 (lowest CPV, broad reach)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Twitter Video:</strong> $0.03 (real-time engagement)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Pinterest Video:</strong> $0.04 (visual discovery)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Instagram Video:</strong> $0.05 (high engagement)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>YouTube:</strong> $0.06 (search and discovery)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>TikTok:</strong> $0.07 (younger demographics)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Snapchat:</strong> $0.08 (Gen Z focused)
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>LinkedIn Video:</strong> $0.15 (B2B targeting premium)
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">Why CPV Matters</h3>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Measure engagement:</strong> Views indicate actual interest, not just ad exposure
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Platform comparison:</strong> Identify which platforms deliver the most cost-effective video engagement
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Budget optimization:</strong> Allocate video ad spend to highest-performing platforms
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Content effectiveness:</strong> Lower CPV suggests more engaging, well-targeted video content
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">What Counts as a View?</h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">View definitions vary by platform:</p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>YouTube:</strong> 30 seconds (or full video if shorter) or when user interacts
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Facebook/Instagram:</strong> 3 seconds of continuous play (for reach), 10 seconds for ThruPlay
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>TikTok:</strong> 6 seconds or full video if shorter, with video 50%+ on screen
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>LinkedIn:</strong> 2 seconds with at least 50% of video on screen
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">How to Lower Your CPV</h3>
    <ol className="space-y-3 mb-6 list-decimal list-inside text-neutral-700 dark:text-neutral-300">
      <li>
        <strong>Create engaging content:</strong> Hook viewers in the first 3 seconds with compelling visuals and
        messaging
      </li>
      <li>
        <strong>Improve targeting:</strong> Reach audiences more likely to watch and engage with your content
      </li>
      <li>
        <strong>Optimize video length:</strong> Test different durations to find the sweet spot for your audience
      </li>
      <li>
        <strong>Test formats:</strong> Try different aspect ratios, styles, and placements (feed vs. stories)
      </li>
      <li>
        <strong>Choose cost-effective platforms:</strong> Match platforms to your target demographic and budget
      </li>
      <li>
        <strong>Use captions:</strong> 85% of Facebook video is watched without sound—make content accessible
      </li>
    </ol>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">CPV vs Other Video Metrics</h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Understanding related video advertising metrics provides a complete picture:
    </p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>CPV (Cost Per View):</strong> Cost for someone to watch your video
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>VTR (View-Through Rate):</strong> Percentage of impressions that become views
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Video Completion Rate:</strong> Percentage of viewers who watch the entire video
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Engagement Rate:</strong> Likes, comments, shares relative to views
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">When to Use CPV Bidding</h3>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">CPV bidding works best for:</p>
    <ul className="space-y-2 mb-6">
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Brand awareness campaigns:</strong> Maximize video views and brand exposure
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Product launches:</strong> Introduce new products with engaging video content
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Educational content:</strong> Share tutorials, demos, or explainer videos
      </li>
      <li className="text-neutral-700 dark:text-neutral-300">
        <strong>Storytelling:</strong> Build emotional connections through narrative content
      </li>
    </ul>
  </>
);

const faqs = [
  {
    question: "What is Cost Per View (CPV)?",
    answer:
      "Cost Per View (CPV) is the amount you pay each time someone views your video ad. It's calculated by dividing total video ad spend by the number of views received, and it's the primary pricing model for video advertising on platforms like YouTube, Facebook, TikTok, and Instagram.",
  },
  {
    question: "How do I calculate CPV?",
    answer:
      "CPV = Total Ad Spend ÷ Total Video Views. For example, if you spent $1,000 and received 15,000 views, your CPV would be $0.067 (about 6.7 cents per view).",
  },
  {
    question: "What is a good CPV?",
    answer:
      "A good CPV varies by platform. Facebook Video averages $0.02, YouTube $0.06, Instagram Video $0.05, TikTok $0.07, and LinkedIn Video $0.15. Lower CPV indicates more cost-efficient video advertising, but should be balanced with view quality and engagement.",
  },
  {
    question: "What counts as a view?",
    answer:
      "View definitions vary by platform. YouTube counts views at 30 seconds or full video if shorter. Facebook/Instagram count views at 3 seconds of continuous play. TikTok requires 6 seconds with 50%+ of video on screen. LinkedIn counts views at 2 seconds with 50%+ visibility. Always check platform-specific definitions.",
  },
  {
    question: "How can I lower my CPV?",
    answer:
      "Lower CPV by creating more engaging content that hooks viewers in the first 3 seconds, improving audience targeting, optimizing video length, testing different formats and placements, choosing cost-effective platforms, and using captions (85% of Facebook video is watched without sound).",
  },
  {
    question: "How is CPV different from CPM?",
    answer: (
      <>
        CPV (Cost Per View) charges when someone actually watches your video, while{" "}
        <Link
          href="/tools/cost-per-mille-calculator"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          CPM
        </Link>{" "}
        (Cost Per Mille) charges per 1,000 impressions regardless of whether viewers watch. CPV is better for
        engagement-focused campaigns, while CPM is better for broad awareness.
      </>
    ),
  },
];

export default function CostPerViewPage() {
  return (
    <ToolPageLayout
      toolSlug="cost-per-view-calculator"
      title="Cost Per View (CPV) Calculator"
      description="Calculate cost per view for video ads and compare across platforms to optimize your video advertising strategy and maximize engagement"
      badge="Free Tool"
      toolComponent={<CostPerViewForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track CPV and video metrics with Rybbit"
      ctaDescription="Monitor cost per view, video engagement, and campaign performance across all platforms in real-time with Rybbit."
      ctaEventLocation="cost_per_view_calculator_cta"
      structuredData={structuredData}
    />
  );
}
