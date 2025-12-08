import { Metadata } from "next";
import Link from "next/link";
import { MetaDescriptionForm } from "./MetaDescriptionForm";
import { ToolPageLayout } from "../components/ToolPageLayout";

export const metadata: Metadata = {
  title: "Free Meta Description Generator | AI-Powered Meta Tag Creator for Better CTR",
  description:
    "Generate compelling meta descriptions in seconds with our free AI tool. Get multiple variations optimized for 150-160 characters. Improve your click-through rates from search results.",
  openGraph: {
    title: "Free Meta Description Generator | AI-Powered Meta Tag Creator for Better CTR",
    description:
      "Generate compelling meta descriptions in seconds with our free AI tool. Get multiple variations optimized for 150-160 characters. Improve your click-through rates from search results.",
    type: "website",
    url: "https://rybbit.com/tools/meta-description-generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Meta Description Generator",
    description:
      "Generate compelling meta descriptions in seconds with our free AI tool. Get multiple variations optimized for 150-160 characters.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/meta-description-generator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Meta Description Generator",
      description:
        "AI-powered tool to generate compelling meta descriptions for better search engine click-through rates",
      applicationCategory: "SEO Tool",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "AI-powered meta description generation",
        "Multiple description variations",
        "Character count optimization",
        "SERP snippet preview",
        "Best practices guidance",
        "Real-time optimization feedback",
      ],
      operatingSystem: "Any",
      url: "https://rybbit.com/tools/meta-description-generator",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What makes a good meta description?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good meta description is 150-160 characters, accurately summarizes the page content, includes relevant keywords naturally, has a clear call-to-action, and is compelling enough to earn clicks from search results. It should match the user's search intent and preview what they'll find on the page.",
          },
        },
        {
          "@type": "Question",
          name: "Do meta descriptions affect SEO rankings?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Meta descriptions don't directly affect rankings, but they significantly impact click-through rates from search results. A compelling description can increase clicks, which can indirectly improve rankings by signaling relevance and user engagement to search engines. They're essential for on-page SEO strategy.",
          },
        },
        {
          "@type": "Question",
          name: "How can I measure meta description performance?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Track your organic click-through rates in Google Search Console and compare pages with different meta descriptions. Use analytics tools to see which pages convert best after visitors arrive from search results. Monitor changes in impressions vs. clicks to identify improvement opportunities.",
          },
        },
        {
          "@type": "Question",
          name: "Should every page have a unique meta description?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, each page should have a unique meta description that accurately describes its specific content. Duplicate meta descriptions across multiple pages confuse search engines about which page is most relevant for a query and reduce click-through rates. Create custom descriptions for each important page.",
          },
        },
        {
          "@type": "Question",
          name: "What happens if I don't write a meta description?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you don't provide a meta description, search engines will auto-generate snippets from your page content. These auto-generated snippets are often less compelling and may not highlight the most relevant information. You'll miss the opportunity to control how your page appears in search results and optimize for clicks.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Why Meta Descriptions Matter for SEO</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Meta descriptions are HTML snippets that summarize your page content for search engines and users. While they
      don't directly affect rankings, they're crucial for improving click-through rates from search results. A
      well-crafted meta description can be the difference between a user clicking on your result or a competitor's,
      making them essential for driving organic traffic to your website.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">
      Best Practices for Meta Descriptions
    </h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Keep it 150-160 characters:</strong> Search engines typically display between 150-160 characters.
        Descriptions longer than this get truncated with an ellipsis, cutting off important information.
      </li>
      <li>
        <strong>Include your primary keyword:</strong> Naturally incorporate your main keyword early in the description
        to help users quickly identify relevance and improve SERP appeal.
      </li>
      <li>
        <strong>Make it compelling:</strong> Write descriptions that encourage clicks by highlighting unique value,
        benefits, or answers. Use power words, numbers, or questions when appropriate to capture attention.
      </li>
      <li>
        <strong>Match search intent:</strong> Ensure your description accurately reflects the page content and matches
        what users expect when they search for your target keyword.
      </li>
      <li>
        <strong>Include a call-to-action:</strong> Use action-oriented language like "Learn," "Discover," "Find out," or
        "Get started" to encourage clicks and engagement.
      </li>
      <li>
        <strong>Be unique for each page:</strong> Each page should have a distinct description tailored to its specific
        content, not a generic company description repeated across all pages.
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">
      Common Meta Description Mistakes to Avoid
    </h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Keyword stuffing:</strong> Don't repeat keywords excessively. It looks spammy, reduces readability, and
        can actually lower your click-through rates as users avoid unnatural-looking results.
      </li>
      <li>
        <strong>Duplicate descriptions:</strong> Using the same description for multiple pages confuses search engines
        about which page is most relevant and wastes opportunities to optimize for different keywords.
      </li>
      <li>
        <strong>Being too vague:</strong> Vague descriptions like "Learn more about our services" don't convince users
        to click. Be specific about what value your page provides.
      </li>
      <li>
        <strong>Ignoring character limits:</strong> Descriptions that are too long get cut off, leaving your
        call-to-action or key information invisible to searchers.
      </li>
      <li>
        <strong>Not updating old descriptions:</strong> Outdated descriptions that no longer match page content hurt
        your click-through rate and user experience.
      </li>
      <li>
        <strong>Forgetting to optimize for mobile:</strong> Remember that mobile SERPs show fewer characters (around
        120-140). Test how descriptions appear on mobile devices.
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">How to Use This Tool</h3>
    <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Enter your page topic:</strong> Describe what your page is about in a few words or a short sentence. Be
        specific about the topic or subject matter.
      </li>
      <li>
        <strong>Add target keywords (optional):</strong> Include specific keywords you want to rank for and appear in
        your descriptions. Separate multiple keywords with commas.
      </li>
      <li>
        <strong>Generate descriptions:</strong> Click the button and our AI will create multiple meta description
        variations tailored to your content.
      </li>
      <li>
        <strong>Review and select:</strong> Review the generated descriptions and choose the one that best matches your
        content, target audience, and SEO goals.
      </li>
      <li>
        <strong>Implement and monitor:</strong> Add your selected description to your page's meta description tag and
        monitor performance in Google Search Console to track CTR improvements.
      </li>
    </ol>
  </>
);

const faqs = [
  {
    question: "What makes a good meta description?",
    answer: (
      <>
        A good meta description is 150-160 characters, accurately summarizes the page content, includes relevant
        keywords naturally, and has a clear call-to-action. It should be compelling enough to earn clicks from search
        results and match exactly what users will find on your page.
      </>
    ),
  },
  {
    question: "Do meta descriptions affect SEO rankings?",
    answer: (
      <>
        Meta descriptions don't directly affect rankings, but they significantly impact click-through rates from search
        results. A compelling description can increase clicks, which can indirectly improve rankings by signaling
        relevance and user engagement to search engines.
      </>
    ),
  },
  {
    question: "How can I measure meta description performance?",
    answer: (
      <>
        Track your organic click-through rates in Google Search Console and compare pages with different meta
        descriptions. Use{" "}
        <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit Analytics
        </Link>{" "}
        to see which pages convert best after visitors arrive from search and identify optimization opportunities.
      </>
    ),
  },
  {
    question: "Should every page have a unique meta description?",
    answer: (
      <>
        Yes, each page should have a unique meta description that accurately describes its specific content. Duplicate
        descriptions across multiple pages confuse search engines and reduce click-through rates. Prioritize important
        pages and create custom descriptions for each.
      </>
    ),
  },
  {
    question: "What happens if I don't write a meta description?",
    answer: (
      <>
        If you don't provide a meta description, search engines will auto-generate snippets from your page content.
        These are often less compelling and may not highlight the most relevant information. You'll miss the opportunity
        to optimize for clicks and control your SERP appearance.
      </>
    ),
  },
];

export default function MetaDescriptionGeneratorPage() {
  return (
    <ToolPageLayout
      toolSlug="meta-description-generator"
      title="Meta Description Generator"
      description="Generate compelling meta descriptions that boost click-through rates. AI-powered variations optimized for search engines."
      badge="AI-Powered Tool"
      toolComponent={<MetaDescriptionForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="seo"
      ctaTitle="Track your SEO performance with Rybbit"
      ctaDescription="Monitor organic traffic, track keyword rankings, and measure the impact of your meta descriptions on click-through rates."
      ctaEventLocation="meta_description_generator_cta"
      structuredData={structuredData}
    />
  );
}
