"use client";

import { useState } from "react";
import { PricingSection } from "./PricingSection";

export function LandingPricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  return <PricingSection isAnnual={isAnnual} setIsAnnual={setIsAnnual} />;
}
