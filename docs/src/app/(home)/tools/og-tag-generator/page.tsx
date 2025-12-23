import { Metadata } from "next";
import Link from "next/link";
import { OGTagForm } from "./OGTagForm";
import { ToolPageLayout } from "../components/ToolPageLayout";

export const metadata: Metadata = {
  title: "Free Open Graph Tag Generator | OG Meta Tag Creator for Social Sharing",
  description:
    "Generate optimized Open Graph tags for social sharing. Create perfect previews for Facebook, Twitter, LinkedIn with our free AI-powered OG tag generator. Learn best practices, image sizes, and testing methods.",
  openGraph: {
    title: "Free Open Graph Tag Generator | Perfect Social Media Previews",
    description:
      "Create optimized OG tags for social sharing. Generate Facebook, Twitter, and LinkedIn previews in seconds with our free tool.",
    type: "website",
    url: "https://rybbit.com/tools/og-tag-generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Open Graph Tag Generator",
    description: "Generate optimized OG tags for social sharing. Perfect previews on Facebook, Twitter, and LinkedIn.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/og-tag-generator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Open Graph Tag Generator",
      applicationCategory: "SEO Tool",
      description: "Free tool to generate optimized Open Graph tags for social sharing",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "AI-powered OG tag generation",
        "Multiple tag variations",
        "Twitter Card optimization",
        "Social preview",
        "HTML code generation",
        "Image size recommendations",
      ],
      operatingSystem: "Any",
      url: "https://rybbit.com/tools/og-tag-generator",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What are Open Graph tags and why do I need them?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Open Graph (OG) tags are meta tags in your HTML head that control how your content appears when shared on social media platforms like Facebook, LinkedIn, and Twitter. They define the title, description, image, and type of content that appears in the social preview. Without OG tags, social media platforms use their default parsing which often results in poor-looking previews. Optimized OG tags significantly increase click-through rates and engagement when content is shared.",
          },
        },
        {
          "@type": "Question",
          name: "What are the required vs optional Open Graph tags?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Required OG tags are: og:title, og:type, og:image, and og:url. These four tags provide the minimum information needed for a social preview. Optional but recommended tags include og:description (summary of content), og:locale (language), and og:site_name. For articles, add og:article:published_time and og:article:author. Twitter Cards require card type, title, and description at minimum.",
          },
        },
        {
          "@type": "Question",
          name: "What are the correct image sizes and specifications for OG tags?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "For og:image, use images that are 1200x630 pixels (1.91:1 aspect ratio) for optimal display on most platforms. Minimum recommended size is 200x200 pixels. File size should be under 8MB. Twitter Card images for summary_large_image should be 506x506 minimum, preferably 1024x512. Use JPG or PNG formats. For og:image:width and og:image:height, specify the actual dimensions of your image. Square images work best for profiles and smaller feeds.",
          },
        },
        {
          "@type": "Question",
          name: "How do I test my Open Graph tags?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use Facebook's Sharing Debugger (facebook.com/developers/tools/debug/) to see how your pages appear on Facebook. Use LinkedIn's Post Inspector (linkedin.com/feed/update/urn:li:activity) to test LinkedIn previews. For Twitter, use the Card Validator (cards-dev.twitter.com/validator). Always clear the cache after making changes. Test on actual social platforms by pasting your URL in the status update box. Track social referral traffic with Rybbit Analytics to see which OG tags drive the most clicks.",
          },
        },
        {
          "@type": "Question",
          name: "What's the difference between Open Graph tags and Twitter Cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Open Graph tags are a protocol developed by Facebook that works across multiple platforms. Twitter Cards use the twitter: prefix and allow more granular control over Twitter-specific previews. Twitter Cards types include summary (small card with summary), summary_large_image (large image card), app (mobile app card), and player (video player card). You should implement both OG tags and Twitter Card tags for complete social optimization. Twitter will fall back to OG tags if Twitter Card tags are missing.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What Are Open Graph Tags?</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Open Graph (OG) tags are meta tags placed in the HTML head of your web pages that control how your content appears
      when shared on social media platforms. Developed by Facebook, the Open Graph protocol works across Facebook,
      LinkedIn, Twitter, Pinterest, and many other social networks.
    </p>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      When someone shares your link on social media, the platform's crawler reads your OG tags to determine what preview
      to display: the title, description, image, and content type. Without proper OG tags, social platforms make their
      best guess by extracting text and images from your page, often resulting in unattractive or irrelevant previews
      that discourage clicks.
    </p>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">
      Why Open Graph Tags Matter for Social Sharing
    </h2>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Increased Click-Through Rates:</strong> Optimized OG images and descriptions increase clicks on social
        shares by 2-3x compared to default previews.
      </li>
      <li>
        <strong>Brand Consistency:</strong> Control exactly how your brand appears across social platforms, ensuring
        consistent messaging and visual branding.
      </li>
      <li>
        <strong>Better Social Engagement:</strong> Professional, well-designed previews encourage sharing and comments,
        leading to increased organic reach.
      </li>
      <li>
        <strong>SEO and Discoverability:</strong> Better social engagement signals can indirectly improve search
        rankings and overall content discoverability.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Required vs Optional OG Tags</h2>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Required Tags (Minimum)</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">og:title</code> - The title of your
        page or content (50-60 characters recommended)
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">og:type</code> - The type of content:
        website, article, product, video.movie, music.song, etc.
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">og:image</code> - URL of the image to
        display (1200x630px recommended)
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">og:url</code> - The canonical URL of
        the page being shared
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-6">Recommended Tags</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">og:description</code> - A brief
        description of the content (150-160 characters)
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
          og:image:width & og:image:height
        </code>{" "}
        - Actual dimensions of the og:image
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">og:site_name</code> - Your website or
        brand name
      </li>
      <li>
        <code className="text-sm font-mono text-emerald-600 dark:text-emerald-400">twitter:card</code> - Twitter Card
        type: summary, summary_large_image, app, or player
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">Open Graph Image Specifications</h2>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Facebook / General:</strong> 1200 x 630 px (1.91:1 aspect ratio), JPG or PNG
      </li>
      <li>
        <strong>Twitter (summary_large_image):</strong> 1024 x 512 px (2:1 aspect ratio), JPG or PNG
      </li>
      <li>
        <strong>LinkedIn:</strong> 1200 x 630 px (1.91:1 aspect ratio), JPG or PNG
      </li>
      <li>
        <strong>Minimum:</strong> 200 x 200 px (1:1 aspect ratio), JPG or PNG
      </li>
    </ul>
    <p className="text-neutral-700 dark:text-neutral-300">
      Use 1200x630px for most platforms (Facebook, LinkedIn, Pinterest). Keep file size under 8MB. Use high-quality JPG
      or PNG. Avoid text in critical image areas as it may be cropped.
    </p>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">How to Test Your OG Tags</h2>
    <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Facebook Sharing Debugger:</strong> Visit facebook.com/developers/tools/debug/ and enter your URL. This
        shows exactly how your page will appear in Facebook feeds and reveals any parsing errors. Pro tip: Click "Scrape
        Again" to refresh the cache after making changes.
      </li>
      <li>
        <strong>LinkedIn Post Inspector:</strong> Visit linkedin.com/feed/update and paste your URL in the status box.
        This preview shows how your content will appear on LinkedIn feeds. Pro tip: LinkedIn sometimes takes time to
        update. Wait a few hours if changes don't appear immediately.
      </li>
      <li>
        <strong>Twitter Card Validator:</strong> Visit cards-dev.twitter.com/validator and enter your URL to preview how
        your page will appear in tweets and Twitter feeds. Pro tip: Check the "Tag" tab to see which tags Twitter
        detected from your page.
      </li>
      <li>
        <strong>Test on Actual Social Platforms:</strong> Paste your URL directly into Facebook, LinkedIn, Twitter, and
        Pinterest status boxes to see real-time previews. This is the most authentic test. Pro tip: Use
        incognito/private browsing mode to avoid cached versions.
      </li>
      <li>
        <strong>Track Performance with Analytics:</strong> Use{" "}
        <Link
          href="https://app.rybbit.io"
          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
        >
          Rybbit Analytics
        </Link>{" "}
        to track which social platforms drive the most traffic to your pages. Measure CTR by platform to see which OG
        tags perform best and optimize accordingly.
      </li>
    </ol>
  </>
);

const faqs = [
  {
    question: "What are Open Graph tags?",
    answer: (
      <>
        Open Graph tags are meta tags that control how URLs are displayed when shared on social media platforms like
        Facebook, LinkedIn, and Twitter. They define the title, description, image, and type of content that appears in
        social shares.
      </>
    ),
  },
  {
    question: "Why are OG tags important?",
    answer: (
      <>
        OG tags significantly impact social media engagement. A well-optimized OG image and description can increase
        click-through rates by 2-3x compared to default previews. They're essential for content marketing and social
        sharing strategy.
      </>
    ),
  },
  {
    question: "How do I test my OG tags?",
    answer: (
      <>
        Use Facebook's Sharing Debugger, LinkedIn's Post Inspector, or Twitter's Card Validator to test how your OG tags
        appear. Track social referral traffic with{" "}
        <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit Analytics
        </Link>{" "}
        to see which OG tags drive the most clicks.
      </>
    ),
  },
  {
    question: "What's the difference between Open Graph tags and Twitter Cards?",
    answer: (
      <>
        Open Graph tags are a protocol developed by Facebook that works across multiple platforms. Twitter Cards use the
        twitter: prefix and allow more granular control over Twitter-specific previews. You should implement both for
        complete social optimization. Twitter will fall back to OG tags if Twitter Card tags are missing.
      </>
    ),
  },
  {
    question: "What image sizes should I use for OG tags?",
    answer: (
      <>
        Use 1200x630 pixels (1.91:1 aspect ratio) for og:image on most platforms. Minimum size is 200x200 pixels. For
        Twitter Cards (summary_large_image), use 1024x512 or larger. Always include og:image:width and og:image:height
        tags. Keep file size under 8MB and use JPG or PNG format.
      </>
    ),
  },
];

export default function OGTagGeneratorPage() {
  return (
    <ToolPageLayout
      toolSlug="og-tag-generator"
      title="Open Graph Tag Generator"
      description="Generate optimized Open Graph tags for social media sharing. Get perfect previews on Facebook, Twitter, and LinkedIn with AI-powered suggestions and complete HTML code."
      badge="AI-Powered Tool"
      toolComponent={<OGTagForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="seo"
      ctaTitle="Track your social media traffic with Rybbit"
      ctaDescription="See which social platforms drive the most traffic and optimize your OG tags based on real data."
      ctaEventLocation="og_tag_generator_cta"
      structuredData={structuredData}
    />
  );
}
