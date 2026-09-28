import { createOGImageUrl } from "@/lib/metadata";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { VsPage } from "../components/VsPage";
import { getVsPair, vsPairs } from "../data/vsPairs";

// Only allowlisted pairs render. Static siblings (/compare/umami, ...) take precedence over this
// segment, and any other /compare/<slug> 404s.
export const dynamicParams = false;

interface VsPairPageProps {
  params: Promise<{ locale: string; pair: string }>;
}

export function generateStaticParams() {
  return vsPairs.map(pair => ({ pair: pair.slug }));
}

export async function generateMetadata({ params }: VsPairPageProps): Promise<Metadata> {
  const { pair: slug } = await params;
  const pair = getVsPair(slug);
  if (!pair) {
    return {};
  }

  const url = `https://rybbit.com/compare/${pair.slug}`;
  const image = createOGImageUrl(pair.title, pair.metaDescription, "Compare");
  return {
    title: pair.title,
    description: pair.metaDescription,
    openGraph: {
      title: pair.title,
      description: pair.metaDescription,
      type: "website",
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: pair.title,
      description: pair.metaDescription,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function VsPairPage({ params }: VsPairPageProps) {
  const { locale, pair: slug } = await params;
  setRequestLocale(locale);
  const pair = getVsPair(slug);
  if (!pair) {
    notFound();
  }

  const url = `https://rybbit.com/compare/${pair.slug}`;
  // The FAQPage entries come from the same `pair.faq` the page renders, so they always match.
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        name: pair.title,
        description: pair.metaDescription,
        url,
        dateModified: pair.verifiedOn,
        isPartOf: {
          "@type": "WebSite",
          name: "Rybbit",
          url: "https://rybbit.com",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: pair.faq.map(item => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <VsPage pair={pair} />
    </>
  );
}
