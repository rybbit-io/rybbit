"use client";

import { Slider } from "@/components/ui/slider";
import { Check, X, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Available event tiers for the slider
const EVENT_TIERS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, "Custom"];

// Define standard plan features
const STANDARD_FEATURES = [
  "Up to 10 websites",
  "Up to 3 team members",
  "Web vitals",
  "Funnels",
  "Goals",
  "Error tracking",
  "Journeys",
  "User profiles",
  "Retention",
  "2 year data retention",
  "Standard support",
];

// Define pro plan features
const PRO_FEATURES = [
  "Everything in Standard",
  "Unlimited websites",
  "Unlimited team members",
  "Session replays",
  "5+ year data retention",
  "Priority support",
];

// Define free plan features
const FREE_FEATURES = [
  { feature: "1 user", included: true },
  { feature: "Up to 3 websites", included: true },
  { feature: "Cookieless tracking", included: true },
  { feature: "Web analytics dashboard", included: true },
  { feature: "Custom events", included: true },
  { feature: "6 month data retention", included: true },
  { feature: "Advanced features", included: false },
  { feature: "Email support", included: false },
];

export const formatter = Intl.NumberFormat("en", {
  notation: "compact",
}).format;

// Format price with dollar sign for both Standard and Pro
function getFormattedPrice(eventLimit: number | string, planType: "standard" | "pro") {
  // Monthly prices
  let monthlyPrice;
  if (typeof eventLimit === "string") return { custom: true }; // Custom pricing

  if (planType === "standard") {
    // Standard tier prices
    if (eventLimit <= 100_000) monthlyPrice = 19;
    else if (eventLimit <= 250_000) monthlyPrice = 29;
    else if (eventLimit <= 500_000) monthlyPrice = 49;
    else if (eventLimit <= 1_000_000) monthlyPrice = 69;
    else if (eventLimit <= 2_000_000) monthlyPrice = 99;
    else if (eventLimit <= 5_000_000) monthlyPrice = 149;
    else if (eventLimit <= 10_000_000) monthlyPrice = 249;
    else return { custom: true };
  } else {
    // Pro tier prices (roughly double)
    if (eventLimit <= 100_000) monthlyPrice = 39;
    else if (eventLimit <= 250_000) monthlyPrice = 59;
    else if (eventLimit <= 500_000) monthlyPrice = 99;
    else if (eventLimit <= 1_000_000) monthlyPrice = 139;
    else if (eventLimit <= 2_000_000) monthlyPrice = 199;
    else if (eventLimit <= 5_000_000) monthlyPrice = 299;
    else if (eventLimit <= 10_000_000) monthlyPrice = 499;
    else return { custom: true };
  }

  // Annual prices are 10x monthly (2 months free)
  const annualPrice = monthlyPrice * 10;
  return {
    monthly: monthlyPrice,
    annual: annualPrice,
    custom: false,
  };
}

export function PricingSection() {
  const [eventLimitIndex, setEventLimitIndex] = useState(0); // Default to 100k (index 0)
  const [isAnnual, setIsAnnual] = useState(false);

  const eventLimit = EVENT_TIERS[eventLimitIndex];
  const standardPrices = getFormattedPrice(eventLimit, "standard");
  const proPrices = getFormattedPrice(eventLimit, "pro");

  // Handle slider changes
  function handleSliderChange(value: number[]) {
    setEventLimitIndex(value[0]);
  }

  return (
    <section className="py-16 md:py-24 w-full">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight pb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-400">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-neutral-300">Privacy-friendly analytics with all the features you need to grow</p>
        </div>

        {/* Shared controls section */}
        <div className="max-w-xl mx-auto mb-8">
          {/* Events per month and billing toggle */}
          <div className="flex justify-between mb-6 items-center">
            <div>
              <h3 className="font-semibold mb-2">Events per month</h3>
              <div className="text-3xl font-bold text-emerald-400">
                {typeof eventLimit === "number" ? eventLimit.toLocaleString() : eventLimit}
              </div>
            </div>
            <div className="flex flex-col items-end">
              {/* Billing toggle */}
              <div className="flex gap-3 mb-2 text-sm">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={cn(
                    "px-3 py-1 rounded-full transition-colors cursor-pointer",
                    !isAnnual
                      ? "bg-emerald-500/20 text-emerald-400 font-medium"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={cn(
                    "px-3 py-1 rounded-full transition-colors cursor-pointer",
                    isAnnual
                      ? "bg-emerald-500/20 text-emerald-400 font-medium"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Annual
                  <span className="ml-1 text-xs text-emerald-500">-17%</span>
                </button>
              </div>
            </div>
          </div>

          {/* Slider */}
          <Slider
            defaultValue={[0]}
            max={EVENT_TIERS.length - 1}
            min={0}
            step={1}
            onValueChange={handleSliderChange}
            className="mb-3"
          />

          <div className="flex justify-between text-xs text-neutral-400">
            {EVENT_TIERS.map((tier, index) => (
              <span key={index} className={cn(eventLimitIndex === index && "font-bold text-emerald-400")}>
                {index === EVENT_TIERS.length - 1
                  ? "10M+"
                  : typeof tier === "number" && tier >= 1_000_000
                  ? `${tier / 1_000_000}M`
                  : typeof tier === "number"
                  ? `${tier / 1_000}K`
                  : "Custom"}
              </span>
            ))}
          </div>
        </div>

        {/* Three card layout */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto justify-center items-stretch">
          {/* Free Plan Card */}
          <div className="w-full lg:w-96 flex-shrink-0 text-neutral-300">
            <div className="bg-neutral-800/15 rounded-xl border border-neutral-700/60 overflow-hidden backdrop-blur-sm shadow-xl h-full">
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">Free</h3>
                  <p className="text-sm text-neutral-400">Perfect for getting started</p>
                </div>

                {/* Price display */}
                <div className="mb-6">
                  <div>
                    <span className="text-3xl font-bold">10,000</span>
                    <span className="ml-1 text-neutral-400">/month events</span>
                  </div>
                </div>

                <Link href="https://app.rybbit.io/signup" className="w-full block">
                  <button
                    data-rybbit-event="signup"
                    data-rybbit-prop-location="free"
                    className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-medium px-5 py-3 rounded-lg border border-neutral-600 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
                  >
                    Start for free
                  </button>
                </Link>
                <div className="space-y-3 mt-6 mb-3">
                  {FREE_FEATURES.map((item, i) => (
                    <div key={i} className="flex items-center">
                      {item.included ? (
                        <Check className="h-4 w-4 text-emerald-400 mr-3 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-neutral-400 mr-3 shrink-0" />
                      )}
                      <span className={"text-sm"}>{item.feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Standard Plan Card */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden backdrop-blur-sm shadow-xl">
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">Standard</h3>
                  <p className="text-sm text-neutral-400">Everything you need to get started</p>
                </div>

                {/* Price display */}
                <div className="mb-6">
                  {standardPrices.custom ? (
                    <div className="text-3xl font-bold">Custom</div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold">
                        ${isAnnual ? Math.round(standardPrices.annual! / 12) : standardPrices.monthly}
                      </span>
                      <span className="ml-1 text-neutral-400">/month</span>
                    </div>
                  )}
                </div>

                {standardPrices.custom ? (
                  <Link href="https://www.rybbit.io/contact" className="w-full block">
                    <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer">
                      Contact us
                    </button>
                  </Link>
                ) : (
                  <Link href="https://app.rybbit.io/signup" className="w-full block">
                    <button
                      data-rybbit-event="signup"
                      data-rybbit-prop-location="standard"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
                    >
                      Try for free
                    </button>
                  </Link>
                )}

                <div className="space-y-4 my-6">
                  {STANDARD_FEATURES.map((feature, i) => (
                    <div key={i} className="flex items-center">
                      <Check className="h-4 w-4 text-emerald-400 mr-3 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <p className="text-center text-sm text-neutral-400 mt-4 flex items-center justify-center gap-2">
                  {standardPrices.custom ? (
                    "Email us at hello@rybbit.io for custom pricing"
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      We don&apos;t ask for your credit card
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Pro Plan Card */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden backdrop-blur-sm shadow-xl h-full">
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">Pro</h3>
                  <p className="text-sm text-neutral-400">Advanced features for professional teams</p>
                </div>

                {/* Price display */}
                <div className="mb-6">
                  {proPrices.custom ? (
                    <div className="text-3xl font-bold">Custom</div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold">
                        ${isAnnual ? Math.round(proPrices.annual! / 12) : proPrices.monthly}
                      </span>
                      <span className="ml-1 text-neutral-400">/month</span>
                    </div>
                  )}
                </div>

                {proPrices.custom ? (
                  <Link href="https://www.rybbit.io/contact" className="w-full block">
                    <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer">
                      Contact us
                    </button>
                  </Link>
                ) : (
                  <Link href="https://app.rybbit.io/signup" className="w-full block">
                    <button
                      data-rybbit-event="signup"
                      data-rybbit-prop-location="pro"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
                    >
                      Try for free
                    </button>
                  </Link>
                )}

                <div className="space-y-4 my-6">
                  {PRO_FEATURES.map((feature, i) => (
                    <div key={i} className="flex items-center">
                      <Check className="h-4 w-4 text-emerald-400 mr-3 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <p className="text-center text-sm text-neutral-400 mt-4 flex items-center justify-center gap-2">
                  {proPrices.custom ? (
                    "Email us at hello@rybbit.io for custom pricing"
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      We don&apos;t ask for your credit card
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
