import type { Metadata } from "next";
import type { ReactNode } from "react";

// Campaign landing pages are near-duplicates of the homepage built for paid
// traffic — keep them out of the index so they don't compete with it.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LandingPageLayout({ children }: { children: ReactNode }) {
  return children;
}
