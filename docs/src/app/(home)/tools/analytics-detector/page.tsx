import { ToolPageLayout } from "../components/ToolPageLayout";
import { AnalyticsDetectorForm } from "./AnalyticsDetectorForm";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Analytics Detector | Website Analytics & Tracking Tool Finder",
  description:
    "Discover what analytics and tracking tools any website is using. Analyze privacy implications, understand data collection practices, and learn about privacy-focused alternatives.",
  openGraph: {
    title: "Free Analytics Detector | Website Analytics & Tracking Tool Finder",
    description:
      "Discover what analytics and tracking tools any website is using. Analyze privacy implications and understand data collection practices.",
    type: "website",
    url: "https://rybbit.com/tools/analytics-detector",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Analytics Detector | Website Analytics & Tracking Tool Finder",
    description: "Discover what analytics and tracking tools any website is using.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/analytics-detector",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://rybbit.com/tools/analytics-detector",
      name: "Analytics Detector",
      description: "Free tool to detect and analyze analytics platforms and tracking tools used on any website",
      url: "https://rybbit.com/tools/analytics-detector",
      applicationCategory: "UtilityApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      creator: {
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
          name: "How does the Analytics Detector tool work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "This tool fetches the website's HTML, analyzes the scripts and tags, and uses AI to identify analytics platforms, tag managers, and tracking technologies. It looks for common patterns, script URLs, and tracking identifiers to provide a comprehensive overview of the tracking infrastructure.",
          },
        },
        {
          "@type": "Question",
          name: "What do the privacy scores mean?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Privacy scores indicate tracking intensity: Low (minimal tracking, privacy-focused tools), Medium (moderate tracking, some cookies), High (extensive tracking, multiple third-party services). This helps you understand data collection practices and the privacy implications of each analytics tool.",
          },
        },
        {
          "@type": "Question",
          name: "Which analytics tools are privacy-focused?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Privacy-focused analytics tools like Rybbit, Fathom, Plausible, and Shynet don't use cookies, don't track users across sites, and are GDPR compliant by default. These alternatives provide valuable insights without compromising user privacy or requiring cookie banners.",
          },
        },
        {
          "@type": "Question",
          name: "What is GDPR compliance and why does it matter for analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "GDPR (General Data Protection Regulation) is EU legislation protecting user privacy. Analytics tools that are GDPR compliant don't require user consent through cookie banners because they don't collect personally identifiable information or engage in cross-site tracking. This simplifies compliance and improves user experience.",
          },
        },
        {
          "@type": "Question",
          name: "Can I switch from traditional analytics to privacy-first alternatives?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, switching is straightforward. Privacy-first analytics tools provide similar insights without the tracking overhead. Most offer data export features and API access. You can typically remove traditional analytics code and replace it with privacy-focused alternatives in minutes.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <section>
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">What Analytics Tools Exist?</h2>
      <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
        Modern websites use various analytics platforms to understand user behavior, measure performance, and optimize
        their content. These tools range from traditional universal analytics solutions that track individual users
        across the web to privacy-focused alternatives that aggregate data without identifying users.
      </p>
      <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">Common analytics platforms include:</p>
      <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 ml-4">
        <li>
          <strong>Google Analytics</strong> - The most widely used analytics platform with comprehensive tracking
        </li>
        <li>
          <strong>Facebook Pixel</strong> - Tracks user behavior for ad targeting and conversion measurement
        </li>
        <li>
          <strong>Tag Managers</strong> - Google Tag Manager, Tealium, and others that deploy multiple tracking codes
        </li>
        <li>
          <strong>Privacy-focused alternatives</strong> - Rybbit, Plausible, Fathom Analytics that prioritize user
          privacy
        </li>
        <li>
          <strong>Specialized tools</strong> - Heatmap tools, session recording, A/B testing platforms
        </li>
      </ul>
    </section>

    <section className="mt-8">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
        Understanding Privacy Concerns with Analytics
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
        Traditional analytics tools often create privacy concerns because they:
      </p>
      <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 ml-4">
        <li>
          <strong>Track users across the web</strong> - Using cookies and identifiers to follow users across multiple
          websites
        </li>
        <li>
          <strong>Collect personally identifiable information</strong> - Building detailed profiles about individual
          users
        </li>
        <li>
          <strong>Share data with third parties</strong> - Selling or sharing user data with advertisers and brokers
        </li>
        <li>
          <strong>Require consent</strong> - Mandating cookie banners due to GDPR and privacy regulations
        </li>
        <li>
          <strong>Store data indefinitely</strong> - Maintaining user profiles for extended periods
        </li>
      </ul>
      <p className="text-neutral-700 dark:text-neutral-300 mt-4 leading-relaxed">
        Privacy-focused alternatives address these concerns by using anonymous tracking that never identifies
        individuals, avoiding cookies, being GDPR compliant by default, and respecting user privacy while still
        providing valuable insights.
      </p>
    </section>

    <section className="mt-8">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">How Analytics Detection Works</h2>
      <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
        The Analytics Detector analyzes a website to identify tracking tools through several methods:
      </p>
      <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 ml-4">
        <li>
          <strong>Script analysis</strong> - Examines JavaScript files and tags loaded on the page
        </li>
        <li>
          <strong>Pattern recognition</strong> - Identifies common URLs and code patterns used by analytics platforms
        </li>
        <li>
          <strong>Identifier detection</strong> - Looks for tracking IDs and configuration parameters
        </li>
        <li>
          <strong>HTTP header inspection</strong> - Analyzes server responses for tracking pixels and redirects
        </li>
        <li>
          <strong>AI classification</strong> - Uses machine learning to categorize detected tools and assess privacy
          impact
        </li>
      </ul>
      <p className="text-neutral-700 dark:text-neutral-300 mt-4 leading-relaxed">
        The detection happens client-side without storing data about the websites you analyze, ensuring your own privacy
        while using this tool.
      </p>
    </section>

    <section className="mt-8">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
        How to Choose the Right Analytics Tool for Your Website
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
        When selecting an analytics tool for your website, consider these factors:
      </p>
      <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300 ml-4">
        <li>
          <strong>Privacy compliance</strong> - Ensure GDPR, CCPA, and other privacy regulation compliance
        </li>
        <li>
          <strong>User experience</strong> - Choose tools that don't require intrusive cookie banners
        </li>
        <li>
          <strong>Feature set</strong> - Match the tool's capabilities to your analytical needs
        </li>
        <li>
          <strong>Performance impact</strong> - Consider script size and loading time implications
        </li>
        <li>
          <strong>Data retention</strong> - Understand how long data is stored and when it's deleted
        </li>
        <li>
          <strong>Cost structure</strong> - Evaluate pricing based on your traffic volume and needs
        </li>
        <li>
          <strong>Support and documentation</strong> - Ensure good integration support and resources
        </li>
      </ul>
      <p className="text-neutral-700 dark:text-neutral-300 mt-4 leading-relaxed">
        Privacy-first analytics solutions have gained significant traction because they eliminate the privacy-compliance
        trade-off: you get excellent insights without the tracking overhead.
      </p>
    </section>
  </>
);

const faqs = [
  {
    question: "How does the Analytics Detector tool work?",
    answer:
      "This tool fetches the website's HTML, analyzes the scripts and tags, and uses AI to identify analytics platforms, tag managers, and tracking technologies. It looks for common patterns, script URLs, and tracking identifiers to provide a comprehensive overview of the tracking infrastructure installed on any website.",
  },
  {
    question: "What do the privacy scores mean?",
    answer: (
      <>
        Privacy scores indicate tracking intensity: <strong>Low</strong> (minimal tracking, privacy-focused tools that
        use anonymous data), <strong>Medium</strong> (moderate tracking, some cookies and user-level analytics),{" "}
        <strong>High</strong> (extensive tracking, multiple third-party services and cross-site tracking). This helps
        you understand data collection practices and the privacy implications of each analytics tool detected.
      </>
    ),
  },
  {
    question: "Which analytics tools are most privacy-focused?",
    answer: (
      <>
        Privacy-focused analytics tools like{" "}
        <Link href="https://rybbit.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit
        </Link>
        , Plausible, Fathom Analytics, and Shynet don't use cookies, don't track users across sites, and are GDPR
        compliant by default. These alternatives provide valuable insights without compromising user privacy or
        requiring cookie banners. They use anonymous aggregated data instead of identifying individual users.
      </>
    ),
  },
  {
    question: "What is GDPR and why does it matter for analytics?",
    answer:
      "GDPR (General Data Protection Regulation) is EU legislation protecting user privacy. Analytics tools that are GDPR compliant don't require user consent through cookie banners because they don't collect personally identifiable information or engage in cross-site tracking. This simplifies compliance, eliminates the need for cookie consent dialogs, and improves user experience while still providing the analytics you need.",
  },
  {
    question: "Can I switch from traditional analytics to privacy-first alternatives?",
    answer:
      "Yes, switching is straightforward and can be done gradually. Privacy-first analytics tools provide similar insights without the tracking overhead. Most offer data export features, API access, and detailed migration guides. You can typically remove traditional analytics code and replace it with privacy-focused alternatives in minutes. Many websites run both in parallel during the transition period.",
  },
];

export default function AnalyticsDetectorPage() {
  return (
    <ToolPageLayout
      toolSlug="analytics-detector"
      title="Analytics Platform Detector"
      description="Discover what analytics and tracking tools any website is using. Analyze privacy implications and understand data collection practices."
      badge="AI-Powered Tool"
      toolComponent={<AnalyticsDetectorForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="privacy"
      ctaTitle="Privacy-first analytics with Rybbit"
      ctaDescription="No cookies, no cross-site tracking, full GDPR compliance."
      ctaEventLocation="analytics_detector_cta"
      structuredData={structuredData}
    />
  );
}
