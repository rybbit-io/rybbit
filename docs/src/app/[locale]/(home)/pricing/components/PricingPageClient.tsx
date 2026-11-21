"use client";

import { useState } from "react";
import { CTASection } from "@/components/CTASection";
import { PricingSection } from "@/components/PricingSection";
import { ComparisonSection } from "./ComparisonSection";

export function PricingPageClient() {
  const [isAnnual, setIsAnnual] = useState(true);
  return (
    <div className="overflow-x-clip">
      <PricingSection isAnnual={isAnnual} setIsAnnual={setIsAnnual} standalone />
      <ComparisonSection isAnnual={isAnnual} />
      <CTASection eventLocation="pricing_bottom_cta" />
    </div>
  );
}
