"use client";

import { useState } from "react";
import { PricingSection } from "./PricingSection";

export function LandingPricing({ chrome }: { chrome?: "framed" | "bare" }) {
  const [isAnnual, setIsAnnual] = useState(true);
  return <PricingSection isAnnual={isAnnual} setIsAnnual={setIsAnnual} chrome={chrome} />;
}
