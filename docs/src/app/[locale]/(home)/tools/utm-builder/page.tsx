import { UTMBuilderForm } from "./UTMBuilderForm";
import { ToolPageLayout } from "../components/ToolPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free UTM Builder | Campaign URL Parameter Generator for Marketing Tracking",
  description:
    "Create trackable UTM campaign URLs instantly. Build utm_source, utm_medium, utm_campaign parameters for Google Analytics and marketing campaign tracking.",
  openGraph: {
    title: "Free UTM Builder | Campaign URL Parameter Generator",
    description:
      "Generate UTM campaign URLs instantly for accurate marketing tracking in Google Analytics and other analytics platforms.",
    type: "website",
    url: "https://rybbit.com/tools/utm-builder",
    siteName: "Rybbit Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free UTM Builder | Campaign URL Parameter Generator",
    description: "Build trackable campaign URLs with UTM parameters for better marketing analytics.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/utm-builder",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "UTM Builder Tool",
      description: "Free tool to generate UTM parameters for campaign URL tracking",
      url: "https://rybbit.com/tools/utm-builder",
      applicationCategory: "Utility",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is UTM tracking?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "UTM (Urchin Tracking Module) parameters are tags added to URLs that help you track the effectiveness of your marketing campaigns in analytics tools like Rybbit, Google Analytics, and others. They tell you exactly where your traffic is coming from and how your campaigns perform.",
          },
        },
        {
          "@type": "Question",
          name: "What are the required UTM parameters?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The three required parameters are: utm_source (identifies the source like google or newsletter), utm_medium (identifies the medium like cpc or email), and utm_campaign (identifies the specific campaign like summer_sale).",
          },
        },
        {
          "@type": "Question",
          name: "How do I track UTM links with Rybbit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Once you have Rybbit installed on your website, UTM parameters are automatically tracked. You can view your campaign performance in your Rybbit dashboard under the UTM section.",
          },
        },
        {
          "@type": "Question",
          name: "What are optional UTM parameters?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "utm_term is used for tracking paid search keywords, while utm_content helps differentiate between different ads or links within the same campaign. These are optional but useful for deeper campaign analysis and A/B testing.",
          },
        },
        {
          "@type": "Question",
          name: "What naming conventions should I follow?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use lowercase letters and underscores instead of spaces (e.g., summer_sale, not Summer Sale). Be consistent across campaigns so data is properly grouped in analytics. Avoid special characters and keep names descriptive but concise.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What are UTM Parameters?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      UTM (Urchin Tracking Module) parameters are special tags you add to the end of your URLs to track your marketing
      campaign performance. When someone clicks a link with UTM parameters, analytics tools like Rybbit, Google
      Analytics, and others automatically capture that data and organize it for you.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Instead of wondering which campaigns drive the most traffic, UTM parameters let you see exactly how many visitors
      came from each campaign, where they came from, and how they behaved on your site.
    </p>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">
      How UTM Parameters Work with Google Analytics
    </h2>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">The Five UTM Parameters</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">utm_source</code> - Where the traffic
        comes from (google, newsletter, facebook)
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">utm_medium</code> - How they got
        there (cpc, email, social, organic)
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">utm_campaign</code> - Which campaign
        it belongs to (summer_sale, product_launch)
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">utm_term</code> - Paid search
        keywords (optional)
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">utm_content</code> - Which ad or link
        was clicked (optional)
      </li>
    </ul>

    <p className="text-neutral-700 dark:text-neutral-300 mb-2">
      <strong>Example URL:</strong>
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 mb-4">
      <code className="text-xs font-mono">
        https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale&utm_term=running_shoes
      </code>
    </p>
    <p className="text-neutral-700 dark:text-neutral-300">
      Google Analytics automatically parses these parameters and shows them in your reports, making it easy to compare
      campaign performance.
    </p>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">
      UTM Naming Conventions & Best Practices
    </h2>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Use Consistent Formatting:</strong> Always use lowercase letters and underscores instead of spaces. This
        ensures consistent data grouping in your analytics. Good: summer_sale, facebook_ads, email_newsletter | Bad:
        Summer Sale, Facebook Ads, Email Newsletter
      </li>
      <li>
        <strong>Be Descriptive but Concise:</strong> Use names that clearly identify the campaign or source without
        being overly long. Short, specific names are easier to remember and less prone to typos.
      </li>
      <li>
        <strong>Establish a Naming Convention:</strong> Create a standard UTM naming scheme for your organization and
        document it. This prevents duplicate or conflicting parameter values. Example scheme: campaign =
        [season]_[product], source = [channel], medium = [type]
      </li>
      <li>
        <strong>Never Use Spaces or Special Characters:</strong> Spaces and special characters can cause encoding
        issues. Stick to alphanumeric characters and underscores.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Common UTM Use Cases</h2>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Email Marketing:</strong> Track which emails drive the most traffic. Use utm_source=newsletter,
        utm_medium=email, and create unique campaign names for each send.
      </li>
      <li>
        <strong>Social Media Campaigns:</strong> Measure performance across platforms. Use
        utm_source=facebook/twitter/linkedin, utm_medium=social, and track A/B tests with utm_content.
      </li>
      <li>
        <strong>Paid Search Ads:</strong> Track Google Ads and Bing campaigns. Use utm_source=google, utm_medium=cpc,
        and utm_term for your keywords to optimize bidding.
      </li>
      <li>
        <strong>Affiliate & Referral Programs:</strong> Monitor performance by partner. Use utm_source=[partner_name],
        utm_medium=affiliate, and utm_content=[unique_id] per partner.
      </li>
      <li>
        <strong>Offline to Online Tracking:</strong> Include UTM parameters in offline marketing materials. QR codes,
        print ads, and events can all drive trackable traffic.
      </li>
      <li>
        <strong>A/B Testing Ads:</strong> Compare different ad creatives or messaging. Use utm_content to differentiate
        versions and measure which performs better.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Common UTM Mistakes to Avoid</h2>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Inconsistent Parameter Values:</strong> Using "Facebook" sometimes and "facebook" other times causes
        data to be split into separate analytics rows. Always use consistent casing and formatting.
      </li>
      <li>
        <strong>Omitting Required Parameters:</strong> While technically you can have partial UTM parameters, missing
        utm_source, utm_medium, or utm_campaign reduces your tracking insight. Always fill at least these three.
      </li>
      <li>
        <strong>Using Spaces and Special Characters:</strong> Spaces become %20 in URLs, and special characters can
        cause encoding issues. Stick to letters, numbers, hyphens, and underscores.
      </li>
      <li>
        <strong>Forgetting to Tag All Links:</strong> If you only tag some of your marketing links, you'll get
        incomplete data. Create a process to tag every single campaign link.
      </li>
      <li>
        <strong>Not Documenting Your Scheme:</strong> Without documented naming conventions, your team will create
        inconsistent UTM parameters. Create and share a style guide.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">How to Use the UTM Builder</h2>
    <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Enter Your Website URL:</strong> Start with your base URL (e.g., https://example.com/products)
      </li>
      <li>
        <strong>Fill Required Fields:</strong> Set your utm_source, utm_medium, and utm_campaign. These three are
        essential for proper tracking.
      </li>
      <li>
        <strong>Add Optional Parameters:</strong> Use utm_term for keywords and utm_content to differentiate ads within
        the same campaign.
      </li>
      <li>
        <strong>Copy Your UTM URL:</strong> Click the Copy button to copy your fully formed URL with all parameters
        included.
      </li>
      <li>
        <strong>Use in Your Campaigns:</strong> Paste the URL in your marketing channels (emails, ads, social posts,
        etc.) and track the results.
      </li>
    </ol>
  </>
);

const faqs = [
  {
    question: "What is UTM tracking?",
    answer:
      "UTM (Urchin Tracking Module) parameters are tags added to URLs that help you track the effectiveness of your marketing campaigns in analytics tools like Rybbit, Google Analytics, and others. They tell you exactly where your traffic is coming from and how your campaigns perform.",
  },
  {
    question: "What are the required UTM parameters?",
    answer:
      "The three required parameters are: utm_source (identifies the source like google or newsletter), utm_medium (identifies the medium like cpc or email), and utm_campaign (identifies the specific campaign like summer_sale).",
  },
  {
    question: "How do I track UTM links with Rybbit?",
    answer:
      "Once you have Rybbit installed on your website, UTM parameters are automatically tracked. You can view your campaign performance in your Rybbit dashboard under the UTM section.",
  },
  {
    question: "What are optional UTM parameters?",
    answer:
      "utm_term is used for tracking paid search keywords, while utm_content helps differentiate between different ads or links within the same campaign. These are optional but useful for deeper campaign analysis and A/B testing.",
  },
  {
    question: "What naming conventions should I follow?",
    answer:
      "Use lowercase letters and underscores instead of spaces (e.g., summer_sale, not Summer Sale). Be consistent across campaigns so data is properly grouped in analytics. Avoid special characters and keep names descriptive but concise.",
  },
];

export default function UTMBuilderPage() {
  return (
    <ToolPageLayout
      toolSlug="utm-builder"
      title="UTM Builder"
      description="Create trackable campaign URLs with UTM parameters. Perfect for tracking your marketing campaigns across different channels and accurately measuring their performance."
      badge="Free Tool"
      toolComponent={<UTMBuilderForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Track your UTM campaigns with Rybbit"
      ctaDescription="See exactly which campaigns drive the most traffic and conversions."
      ctaEventLocation="utm_builder_cta"
      structuredData={structuredData}
    />
  );
}
