import type { Metadata } from "next";
import Link from "next/link";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { CookieTrackerScannerForm } from "./CookieTrackerScannerForm";

const canonicalUrl = "https://rybbit.com/tools/cookie-tracker-scanner";
const description =
  "Scan a public page for response cookies and recognizable tracking scripts. Get a clear, privacy-aware report without installing software or creating an account.";

export const metadata: Metadata = {
  title: "Free Cookie & Tracker Scanner | Rybbit",
  description,
  alternates: { canonical: canonicalUrl },
  openGraph: { title: "Free Cookie & Tracker Scanner", description, type: "website", url: canonicalUrl },
  twitter: { card: "summary_large_image", title: "Free Cookie & Tracker Scanner", description },
};

const faqs = [
  {
    question: "What does the cookie and tracker scanner inspect?",
    answer:
      "It fetches the public page's first HTML response, reads its Set-Cookie headers, and checks the returned markup for recognizable tracker signatures. It does not execute the page's JavaScript or crawl other pages.",
  },
  {
    question: "Can this scan find every cookie and tracker?",
    answer:
      "No. A browser can load scripts, pixels, and cookies after JavaScript runs, after a user interacts, or after consent is granted. Treat this report as a transparent first-response check, not an exhaustive compliance audit.",
  },
  {
    question: "Does a cookie always mean a visitor is being tracked?",
    answer:
      "No. Cookies can preserve a login, security state, language, cart, or other essential preference. Review each cookie's purpose, duration, and scope before deciding whether it is necessary or requires consent.",
  },
  {
    question: "Why might a protected site return an incomplete scan?",
    answer:
      "Some sites block automated requests, require authentication, or return a challenge page instead of their normal markup. In those cases, scan a public page and confirm the result with your browser's developer tools.",
  },
  {
    question: "How can I reduce analytics cookies on my site?",
    answer: (
      <>
        Start by removing tools you do not use and documenting the purpose of every remaining cookie. A cookieless
        analytics platform such as{" "}
        <Link href="/" className="text-emerald-700 hover:underline dark:text-emerald-400">
          Rybbit
        </Link>{" "}
        can provide site insights without persistent visitor identifiers.
      </>
    ),
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Cookie and Tracker Scanner",
      description,
      url: canonicalUrl,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      creator: { "@type": "Organization", name: "Rybbit", url: "https://rybbit.com" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            typeof faq.answer === "string"
              ? faq.answer
              : "Reduce unnecessary tracking, document each cookie's purpose, and consider cookieless analytics such as Rybbit.",
        },
      })),
    },
  ],
};

const educationalContent = (
  <>
    <section>
      <h2>What a cookie and tracker scan can tell you</h2>
      <p>
        A first-response scan gives you a fast inventory of signals present in the HTML a server returns. It can reveal
        cookies set in HTTP headers and recognizable scripts for analytics, advertising, tag management, and session
        replay. That makes it a useful starting point when reviewing a new site, a vendor integration, or an unexpected
        change in your own stack.
      </p>
      <p>
        The result is intentionally evidence-based: each tracker match names the signature it found, while cookies are
        shown with their declared scope and security attributes. A match indicates code is present, not that every
        visitor is necessarily tracked.
      </p>
    </section>

    <section>
      <h2>How to interpret response cookies</h2>
      <p>
        <strong>Secure</strong> restricts a cookie to HTTPS connections, while <strong>HttpOnly</strong> prevents
        client-side JavaScript from reading it. <strong>SameSite</strong> controls when a cookie can accompany
        cross-site requests. These attributes improve security, but they do not explain the cookie&apos;s purpose or
        determine whether consent is required.
      </p>
      <p>
        Session cookies expire when the browser session ends. Persistent cookies use an Expires or Max-Age attribute.
        Review long-lived, broadly scoped cookies carefully, especially when a third party controls the receiving
        domain.
      </p>
    </section>

    <section>
      <h2>Why this is not a full browser audit</h2>
      <p>
        Modern pages often add trackers after hydration, a consent choice, a route change, or a user interaction. This
        scanner does not run JavaScript or click a consent banner, so those later requests are outside its view. Browser
        developer tools, consent-management logs, and a legal review remain important for a complete audit.
      </p>
      <p>
        Use the report to form specific follow-up questions: who owns this script, which data does it send, how long is
        that data retained, and can the same product decision be supported with less visitor-level tracking?
      </p>
    </section>
  </>
);

export default function CookieTrackerScannerPage() {
  return (
    <ToolPageLayout
      toolSlug="cookie-tracker-scanner"
      title="Cookie / Tracker Scanner"
      description="Inspect a public page's first response for cookies and recognizable tracking code, with honest scope and readable evidence."
      toolComponent={<CookieTrackerScannerForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="privacy"
      ctaTitle="Understand traffic without tracking people"
      ctaDescription="Rybbit gives you clear website analytics with a lightweight, cookieless script and privacy-friendly defaults."
      ctaEventLocation="cookie_tracker_scanner_cta"
      structuredData={structuredData}
    />
  );
}
