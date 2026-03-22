import type { Metadata } from "next";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { PricingPageClient } from "./components/PricingPageClient";

export const metadata: Metadata = createMetadata({
  title: "Pricing",
  description: "Rybbit pricing plans and features",
  openGraph: {
    images: [createOGImageUrl("Pricing", "Rybbit pricing plans and features")],
  },
  twitter: {
    images: [createOGImageUrl("Pricing", "Rybbit pricing plans and features")],
  },
});

export default function PricingPage() {
  return <PricingPageClient />;
}
