import type { Metadata } from "next";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";

interface CompareLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

// Comparison content (tables, deep dives, FAQs) is English-only; other locales only translate the
// template chrome and already canonicalize to the English URL. Indexed, those near-duplicates
// competed with the English pages for English queries, so keep them crawlable-but-unindexed.
export async function generateMetadata({ params }: CompareLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale === routing.defaultLocale) {
    return {};
  }
  return { robots: { index: false, follow: true } };
}

export default function CompareLayout({ children }: CompareLayoutProps) {
  return children;
}
