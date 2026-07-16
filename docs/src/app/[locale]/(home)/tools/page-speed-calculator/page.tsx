import { Metadata } from "next";
import { PageSpeedForm } from "./PageSpeedForm";
import { ToolPageLayout } from "../components/ToolPageLayout";

export const metadata: Metadata = {
  title: "Free Page Speed Calculator | Website Load Time Impact Calculator",
  description:
    "Calculate how page load time affects your conversions and revenue. See the real cost of a slow website. Use our free page speed impact calculator to understand performance metrics.",
  openGraph: {
    title: "Free Page Speed Calculator | Website Load Time Impact Calculator",
    description:
      "Calculate how page load time affects your conversions and revenue. See the real cost of a slow website.",
    type: "website",
    url: "https://rybbit.com/tools/page-speed-calculator",
    siteName: "Rybbit",
    images: [
      {
        url: "https://rybbit.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Page Speed Calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Page Speed Calculator | Website Load Time Impact Calculator",
    description: "Calculate how page load time affects your conversions and revenue.",
    images: ["https://rybbit.com/og-image.png"],
  },
  alternates: {
    canonical: "https://rybbit.com/tools/page-speed-calculator",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Page Speed Impact Calculator",
      description:
        "Calculate how page load time affects your conversions and revenue. See the real cost of a slow website.",
      url: "https://rybbit.com/tools/page-speed-calculator",
      applicationCategory: "WebApplication",
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
          name: "How much does page speed really matter?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Studies show that for every 1 second delay in page load time, conversions decrease by approximately 7%, bounce rate increases by 7%, and customer satisfaction drops by 16%. A 2-second delay can result in abandonment rates up to 87% for e-commerce sites.",
          },
        },
        {
          "@type": "Question",
          name: "What are Google Core Web Vitals and why are they important?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Google Core Web Vitals are three key metrics that measure user experience: Largest Contentful Paint (LCP, visual loading speed), First Input Delay (FID, responsiveness), and Cumulative Layout Shift (CLS, visual stability). Google uses these metrics as ranking factors in search results, making them essential for SEO.",
          },
        },
        {
          "@type": "Question",
          name: "What's a good page load time?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Google recommends pages load in under 3 seconds on mobile. However, the faster the better—pages that load in under 1 second see significantly higher engagement. Amazon found that every 100ms improvement in load time increased revenue by 1%.",
          },
        },
        {
          "@type": "Question",
          name: "What are the best ways to improve page speed?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Key improvements include: optimizing images, minifying CSS/JS files, enabling browser caching, using a Content Delivery Network, reducing server response time, eliminating render-blocking resources, and choosing lightweight analytics tools.",
          },
        },
        {
          "@type": "Question",
          name: "How can analytics tools affect my page speed?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Many analytics tools can significantly impact page performance by loading large scripts synchronously and making blocking network requests. Tools like Rybbit are designed to minimize this impact with lightweight asynchronous loading.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Why Page Speed Matters</h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      Page speed is one of the most critical factors affecting user experience and business metrics. Every millisecond
      counts—slow-loading pages lead to higher bounce rates, reduced engagement, and ultimately lost revenue.
    </p>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Impact on Conversions:</strong> Research shows a direct correlation: every 1-second delay in page load
        time results in approximately 7% loss in conversions. For e-commerce sites, this translates to thousands of
        dollars in lost revenue monthly.
      </li>
      <li>
        <strong>Google Core Web Vitals:</strong> Google uses Core Web Vitals as ranking factors. Sites with poor page
        speed are penalized in search results, reducing organic visibility. LCP, FID, and CLS are critical metrics to
        monitor and optimize.
      </li>
    </ul>

    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 mt-8">
      Page Speed Optimization Techniques
    </h2>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Image Optimization:</strong> Compress images, use modern formats (WebP), and implement lazy loading for
        below-the-fold content.
      </li>
      <li>
        <strong>Asset Minification:</strong> Minify CSS and JavaScript files to reduce file sizes and improve load
        times.
      </li>
      <li>
        <strong>Caching Strategy:</strong> Enable browser caching and implement server-side caching to serve content
        faster.
      </li>
      <li>
        <strong>Content Delivery:</strong> Use a CDN to serve content from servers geographically closer to your users.
      </li>
      <li>
        <strong>Tool Selection:</strong> Choose lightweight tools like Rybbit (3KB) instead of heavyweight analytics
        solutions that slow down your site.
      </li>
    </ul>
  </>
);

const faqs = [
  {
    question: "How much does page speed really matter?",
    answer: (
      <>
        Studies show that for every 1 second delay in page load time, conversions decrease by approximately 7%, bounce
        rate increases by 7%, and customer satisfaction drops by 16%. A 2-second delay can result in abandonment rates
        up to 87% for e-commerce sites.
      </>
    ),
  },
  {
    question: "What are Google Core Web Vitals and why are they important?",
    answer: (
      <>
        Google Core Web Vitals are three key metrics that measure user experience: Largest Contentful Paint (LCP, visual
        loading speed), First Input Delay (FID, responsiveness), and Cumulative Layout Shift (CLS, visual stability).
        Google uses these metrics as ranking factors in search results, making them essential for SEO.
      </>
    ),
  },
  {
    question: "What's a good page load time?",
    answer: (
      <>
        Google recommends pages load in under 3 seconds on mobile. However, the faster the better—pages that load in
        under 1 second see significantly higher engagement. Amazon found that every 100ms improvement in load time
        increased revenue by 1%.
      </>
    ),
  },
  {
    question: "What are the best ways to improve page speed?",
    answer: (
      <>
        Key improvements include: optimizing images, minifying CSS/JS files, enabling browser caching, using a Content
        Delivery Network, reducing server response time, eliminating render-blocking resources, and choosing lightweight
        analytics tools.
      </>
    ),
  },
  {
    question: "How can analytics tools affect my page speed?",
    answer: (
      <>
        Many analytics tools can significantly impact page performance by loading large scripts synchronously and making
        blocking network requests. Tools like Rybbit are designed to minimize this impact with lightweight asynchronous
        loading.
      </>
    ),
  },
];

export default function PageSpeedCalculatorPage() {
  return (
    <ToolPageLayout
      toolSlug="page-speed-calculator"
      title="Page Speed Impact Calculator"
      description="Calculate how page load time affects your conversions and revenue. See the real cost of a slow website."
      badge="Free Tool"
      toolComponent={<PageSpeedForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Optimize your site speed with Rybbit"
      ctaDescription="Rybbit is a lightweight analytics solution (3KB) that won't slow down your site. Monitor performance while maintaining fast load times."
      ctaEventLocation="page_speed_calculator_cta"
      structuredData={structuredData}
    />
  );
}
