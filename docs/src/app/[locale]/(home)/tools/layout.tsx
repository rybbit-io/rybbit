import type { Metadata } from "next";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";

interface ToolsLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

// Non-default-locale tool pages are auto-generated duplicates that already canonicalize to the
// English URL. Keep them crawlable-but-unindexed so they drop out of the index without adding a
// thin-duplicate footprint. English (default locale) pages remain fully indexable.
export async function generateMetadata({ params }: ToolsLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale === routing.defaultLocale) {
    return {};
  }
  return { robots: { index: false, follow: true } };
}

export default function ToolsLayout({ children }: ToolsLayoutProps) {
  return children;
}
