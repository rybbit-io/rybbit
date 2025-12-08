import { ToolPageLayout } from "../components/ToolPageLayout";
import { SEOTitleForm } from "./SEOTitleForm";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free SEO Title Generator | AI-Powered Title Tag Creator for Better Rankings",
  description:
    "Generate optimized SEO title tags in seconds with our free AI-powered tool. Get multiple title variations, character count validation, and SEO best practices. Perfect for improving click-through rates and search rankings.",
  openGraph: {
    title: "Free SEO Title Generator | Create Optimized Title Tags",
    description:
      "AI-powered tool to generate click-worthy SEO titles. Free, unlimited use. Optimize your title tags for better search engine rankings.",
    type: "website",
    url: "https://rybbit.com/tools/seo-title-generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free SEO Title Generator",
    description: "Generate optimized SEO titles with AI in seconds. Free tool with unlimited use.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/seo-title-generator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "SEO Title Generator",
      applicationCategory: "SEO Tool",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "AI-powered title generation",
        "Character count validation",
        "Multiple title variations",
        "SEO best practices",
        "Real-time optimization",
      ],
      operatingSystem: "Any",
      url: "https://rybbit.com/tools/seo-title-generator",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What makes a good SEO title?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A good SEO title is 50-60 characters, includes your primary keyword, accurately describes the page content, and is compelling enough to attract clicks. Front-load important keywords and make it unique for each page.",
          },
        },
        {
          "@type": "Question",
          name: "Why is title length important?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Google typically displays the first 50-60 characters of a title tag. Longer titles get truncated with '...' which can reduce click-through rates. Keep your most important information at the start.",
          },
        },
        {
          "@type": "Question",
          name: "How do I track title performance?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use analytics to track CTR from search results. Tools like Rybbit can show you which pages get the most organic traffic, helping you identify successful titles and opportunities for improvement.",
          },
        },
        {
          "@type": "Question",
          name: "Should I include my brand name in the title tag?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Include your brand name at the end of the title tag if you have characters to spare, especially for branded searches. Format: 'Primary Keyword - Secondary Keyword | Brand Name'. For homepage and key landing pages, brand name can be more prominent.",
          },
        },
        {
          "@type": "Question",
          name: "How often should I update my title tags?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Update title tags when you notice declining CTR, keyword rankings drop, or when your content significantly changes. Test new titles during seasonal campaigns or when targeting new keywords. Monitor performance for 2-4 weeks before making additional changes.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Why SEO Title Tags Matter</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Your title tag is one of the most important on-page SEO elements. It appears in search engine results pages
      (SERPs) as the clickable headline and tells both search engines and users what your page is about. A well-crafted
      title tag can significantly improve your click-through rate (CTR) and search rankings.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">Best Practices for SEO Titles</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Keep it 50-60 characters:</strong> Search engines typically display the first 50-60 characters. Anything
        longer gets truncated with an ellipsis.
      </li>
      <li>
        <strong>Include your primary keyword:</strong> Place your main keyword near the beginning of the title for
        maximum SEO impact.
      </li>
      <li>
        <strong>Make it compelling:</strong> Your title should entice users to click. Use power words, numbers, or
        questions when appropriate.
      </li>
      <li>
        <strong>Be unique:</strong> Each page should have a unique title tag that accurately describes its specific
        content.
      </li>
      <li>
        <strong>Match search intent:</strong> Align your title with what users are actually searching for and expecting
        to find.
      </li>
      <li>
        <strong>Include modifiers:</strong> Words like "best," "guide," "2024," or "free" can help you rank for
        long-tail variations.
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">
      Common Title Tag Mistakes to Avoid
    </h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Keyword stuffing:</strong> Don't repeat the same keyword multiple times. It looks spammy and can hurt
        rankings.
      </li>
      <li>
        <strong>Being too vague:</strong> Generic titles like "Home" or "Products" don't help users or search engines
        understand your content.
      </li>
      <li>
        <strong>Duplicate titles:</strong> Using the same title across multiple pages confuses search engines about
        which page to rank.
      </li>
      <li>
        <strong>Ignoring branding:</strong> For established brands, omitting your brand name can reduce branded search
        visibility.
      </li>
      <li>
        <strong>Writing for bots, not humans:</strong> While keywords matter, your title should still read naturally and
        appeal to real people.
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">
      How to Use This SEO Title Generator
    </h3>
    <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Enter your page topic:</strong> Describe what your page is about in a few words.
      </li>
      <li>
        <strong>Add target keywords (optional):</strong> Include specific keywords you want to rank for, separated by
        commas.
      </li>
      <li>
        <strong>Generate titles:</strong> Our AI will create multiple optimized title variations for you.
      </li>
      <li>
        <strong>Review and select:</strong> Choose the title that best matches your content and target audience.
      </li>
      <li>
        <strong>Test and optimize:</strong> Monitor your CTR and rankings, then refine as needed.
      </li>
    </ol>
  </>
);

const faqs = [
  {
    question: "What makes a good SEO title?",
    answer:
      "A good SEO title is 50-60 characters, includes your primary keyword, accurately describes the page content, and is compelling enough to attract clicks. Front-load important keywords and make it unique for each page.",
  },
  {
    question: "Why is title length important?",
    answer:
      'Google typically displays the first 50-60 characters of a title tag. Longer titles get truncated with "..." which can reduce click-through rates. Keep your most important information at the start.',
  },
  {
    question: "How do I track title performance?",
    answer: (
      <>
        Use analytics to track CTR from search results. Tools like{" "}
        <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit
        </Link>{" "}
        can show you which pages get the most organic traffic, helping you identify successful titles and opportunities
        for improvement.
      </>
    ),
  },
  {
    question: "Should I include my brand name in the title tag?",
    answer:
      'Include your brand name at the end of the title tag if you have characters to spare, especially for branded searches. Format: "Primary Keyword - Secondary Keyword | Brand Name". For homepage and key landing pages, brand name can be more prominent.',
  },
  {
    question: "How often should I update my title tags?",
    answer:
      "Update title tags when you notice declining CTR, keyword rankings drop, or when your content significantly changes. Test new titles during seasonal campaigns or when targeting new keywords. Monitor performance for 2-4 weeks before making additional changes.",
  },
];

export default function SEOTitleGeneratorPage() {
  return (
    <ToolPageLayout
      toolSlug="seo-title-generator"
      title="SEO Title Generator"
      description="Generate optimized, click-worthy title tags for your pages using AI. Get multiple variations tailored to your topic and keywords."
      badge="AI-Powered Tool"
      toolComponent={<SEOTitleForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="seo"
      ctaTitle="Track your SEO performance with Rybbit"
      ctaDescription="Monitor organic traffic, CTR, and page performance in real-time."
      ctaEventLocation="seo_title_generator_cta"
      structuredData={structuredData}
    />
  );
}
