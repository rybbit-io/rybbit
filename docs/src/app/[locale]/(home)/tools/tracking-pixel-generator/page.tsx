import type { Metadata } from "next";

import { ToolPageLayout } from "../components/ToolPageLayout";
import { TrackingPixelGeneratorForm } from "./TrackingPixelGeneratorForm";

const canonicalUrl = "https://rybbit.com/tools/tracking-pixel-generator";
const description =
  "Generate a consent-conscious tracking pixel HTML snippet. Add encoded URL parameters, a cache-buster placeholder, referrer controls, and copy-ready code.";

export const metadata: Metadata = {
  title: "Free Tracking Pixel Generator | Rybbit",
  description,
  alternates: { canonical: canonicalUrl },
  openGraph: { title: "Free Tracking Pixel Generator", description, type: "website", url: canonicalUrl },
  twitter: { card: "summary_large_image", title: "Free Tracking Pixel Generator", description },
};

const faqs = [
  {
    question: "What is a tracking pixel?",
    answer:
      "A tracking pixel is a tiny image request made to a server. The request can record a timestamp and standard HTTP details, plus any URL parameters you intentionally include. The visible image itself carries no meaningful content.",
  },
  {
    question: "Does the preview send a request to my endpoint?",
    answer:
      "No. This generator displays the final request URL as text and never loads the image endpoint. A request occurs only after you place and render the generated snippet in your own page or message.",
  },
  {
    question: "What should replace the timestamp placeholder?",
    answer:
      "Replace {{timestamp}} when you render the snippet with a unique value such as the current Unix timestamp. This changes the URL so browsers and intermediaries are less likely to reuse a cached response.",
  },
  {
    question: "Do tracking pixels require consent?",
    answer:
      "Requirements depend on the data collected, purpose, location, and applicable law. A pixel can disclose network and browser information even without cookies. Document the purpose, minimize data, and render the snippet only after any required consent.",
  },
  {
    question: "When is cookieless analytics a better choice?",
    answer:
      "If your goal is aggregate website measurement, a privacy-friendly analytics script can provide pageviews, referrers, journeys, and conversions without building visitor profiles. A custom pixel is better reserved for a narrow, documented event your endpoint must receive.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Tracking Pixel Generator",
      description,
      url: canonicalUrl,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      creator: { "@type": "Organization", name: "Rybbit", url: "https://rybbit.com" },
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
    <section>
      <h2>How an image pixel records an event</h2>
      <p>
        When a browser renders an image element, it requests the URL in its src attribute. A server can count that
        request as an event and read standard request details such as time, user agent, IP address, and (depending on
        the referrer policy) the page origin. Query parameters can add a concise event name or campaign identifier.
      </p>
      <p>
        The generated element is one pixel wide and has empty alternative text, so assistive technology treats it as
        decorative. The preview deliberately does not load the endpoint; it shows the request as text so creating a
        snippet never pollutes your data.
      </p>
    </section>

    <section>
      <h2>Use parameters as a small, intentional schema</h2>
      <p>
        Prefer stable parameters such as event, campaign, or placement. Avoid names, email addresses, full page URLs
        with sensitive query strings, or persistent visitor IDs. The receiving endpoint should validate values, limit
        retention, and ignore unknown parameters.
      </p>
      <p>
        A cache-buster makes otherwise identical requests unique. This generator uses a clear timestamp placeholder
        because static HTML cannot compute a new value by itself. Replace it in your template or application when the
        pixel is rendered.
      </p>
    </section>

    <section>
      <h2>Consent and delivery considerations</h2>
      <p>
        An image request still shares data with its destination even when it sets no cookie. Decide which lawful basis
        applies, state the purpose in your privacy notice, and render the snippet only after any required consent. Keep
        the endpoint under your control where possible and use HTTPS for transport security.
      </p>
      <p>
        Pixels provide a narrow delivery mechanism, not a complete analytics model. For broader measurement, use a
        purpose-built privacy-friendly analytics system that handles events, sessions, retention, and reporting without
        turning every implementation detail into a custom endpoint.
      </p>
    </section>
  </>
);

export default function TrackingPixelGeneratorPage() {
  return (
    <ToolPageLayout
      toolSlug="tracking-pixel-generator"
      title="Tracking Pixel Generator"
      description="Build a copy-ready image pixel with encoded parameters, referrer controls, and a preview that never fires the request."
      toolComponent={<TrackingPixelGeneratorForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="analytics"
      ctaTitle="Upgrade from a single pixel to full analytics"
      ctaDescription="Rybbit turns privacy-friendly pageviews and events into clear journeys, funnels, and conversion insights."
      ctaEventLocation="tracking_pixel_generator_cta"
      structuredData={structuredData}
    />
  );
}
