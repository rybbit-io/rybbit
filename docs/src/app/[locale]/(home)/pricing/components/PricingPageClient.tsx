"use client";

import { useState } from "react";
import { BackgroundGrid } from "@/components/BackgroundGrid";
import { PricingSection } from "@/components/PricingSection";
import { ComparisonSection } from "./ComparisonSection";

export function PricingPageClient() {
  const [isAnnual, setIsAnnual] = useState(true);
  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden">
      <BackgroundGrid />
      <PricingSection isAnnual={isAnnual} setIsAnnual={setIsAnnual} />
      <ComparisonSection isAnnual={isAnnual} />
    </div>
  );
}
