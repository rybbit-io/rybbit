"use client";

import { Slider } from "@/components/ui/slider";
import { authClient } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/const";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { DEFAULT_EVENT_LIMIT } from "../../../lib/subscription/constants";
import { trackAdEvent } from "../../../lib/trackAdEvent";
import { FeaturesList } from "./FeaturesList";
import {
  ENTERPRISE_FEATURES,
  EVENT_TIERS,
  FREE_FEATURES,
  PRO_FEATURES,
  STANDARD_FEATURES,
  findPriceForTier,
  formatEventTier,
} from "./utils";

import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";

export function PricingCard({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [siteId] = useQueryState("siteId");
  const router = useRouter();

  const [eventLimitIndex, setEventLimitIndex] = useState<number>(0);
  const [isAnnual, setIsAnnual] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data: activeOrg } = authClient.useActiveOrganization();

  const eventLimit = EVENT_TIERS[eventLimitIndex];

  // Handle subscription for a specific plan type
  async function handleSubscribe(planType: "standard" | "pro"): Promise<void> {
    // Handle custom tier by redirecting to email contact
    if (eventLimit === "Custom") {
      window.location.href = "https://www.rybbit.com/contact";
      return;
    }

    // Check if user is logged in directly
    if (!isLoggedIn) {
      toast.error("Please log in to subscribe.");
      return;
    }

    // Check if user has an active organization
    if (!activeOrg) {
      toast.error("Please select an organization to subscribe.");
      return;
    }

    const selectedTierPrice = findPriceForTier(eventLimit, isAnnual ? "year" : "month", planType);

    if (!selectedTierPrice) {
      toast.error("Selected pricing plan not found. Please adjust the slider.");
      return;
    }

    setIsLoading(true);
    try {
      // Use NEXT_PUBLIC_BACKEND_URL if available, otherwise use relative path for same-origin requests
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/settings/organization/subscription?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/subscribe${siteId ? `?siteId=${siteId}` : ""}`;

      const response = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Send cookies
        body: JSON.stringify({
          priceId: selectedTierPrice.priceId,
          successUrl: successUrl,
          cancelUrl: cancelUrl,
          organizationId: activeOrg.id,
        }),
      });

      const data = await response.json();
      trackAdEvent("checkout", { tier: selectedTierPrice.name });

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl; // Redirect to Stripe checkout
      } else {
        throw new Error("Checkout URL not received.");
      }
    } catch (error: any) {
      toast.error(`Subscription failed: ${error.message}`);
      setIsLoading(false); // Stop loading on error
    }
  }

  // Handle slider changes
  function handleSliderChange(value: number[]): void {
    setEventLimitIndex(value[0]);
  }

  // Get pricing information for both plans
  const standardMonthlyPrice = findPriceForTier(eventLimit, "month", "standard")?.price || 0;
  const standardAnnualPrice = findPriceForTier(eventLimit, "year", "standard")?.price || 0;
  const proMonthlyPrice = findPriceForTier(eventLimit, "month", "pro")?.price || 0;
  const proAnnualPrice = findPriceForTier(eventLimit, "year", "pro")?.price || 0;
  const isCustomTier = eventLimit === "Custom";

  return (
    <div className="max-w-6xl mx-auto">
      {/* Shared controls section */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex justify-between mb-6 items-center">
          <div>
            <h3 className="font-semibold mb-2">Monthly pageviews</h3>
            <div className="text-3xl font-bold text-emerald-400">
              {typeof eventLimit === "number" ? eventLimit.toLocaleString() : eventLimit}
            </div>
          </div>
          <div className="flex flex-col items-end">
            {/* Billing toggle */}
            <div className="flex mb-2 text-sm">
              <button
                onClick={() => setIsAnnual(false)}
                className={cn(
                  "px-3 py-1 rounded-full transition-colors cursor-pointer",
                  !isAnnual
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={cn(
                  "px-3 py-1 rounded-full transition-colors cursor-pointer",
                  isAnnual
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
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

        <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
          {EVENT_TIERS.map((tier, index) => (
            <span
              key={index}
              className={cn(eventLimitIndex === index && "font-bold text-emerald-600 dark:text-emerald-400")}
            >
              {formatEventTier(tier)}
            </span>
          ))}
        </div>
      </div>

      {/* Cards section */}
      <div className="grid min-[1100px]:grid-cols-4 min-[600px]:grid-cols-2 min-[400px]:grid-cols-1 gap-6 max-w-6xl mx-auto mb-16">
        {/* Free Plan Card */}
        <div className="bg-neutral-100/30 dark:bg-neutral-800/15 rounded-xl border border-neutral-150 dark:border-neutral-800/60 overflow-hidden text-neutral-600 dark:text-neutral-300 shadow:lg">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 h-10">Perfect for hobby projects</p>
            </div>

            {/* Price display */}
            <div className="mb-6">
              <div>
                <span className="text-3xl font-bold">{DEFAULT_EVENT_LIMIT.toLocaleString()}</span>
                <span className="ml-1 text-neutral-600 dark:text-neutral-400">pageviews/m</span>
              </div>
            </div>

            {/* Current plan button */}
            <button
              onClick={() => (siteId ? router.push(`/${siteId}`) : {})}
              disabled={!siteId}
              className="w-full bg-neutral-200 dark:bg-neutral-850 hover:bg-neutral-150 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium px-5 py-3 rounded-xl border border-neutral-250 dark:border-neutral-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer transition all duration-200"
            >
              {siteId ? "Continue free" : "Current plan"}
            </button>

            {/* Features */}
            <FeaturesList features={FREE_FEATURES} />
          </div>
        </div>

        {/* Standard Plan Card */}
        <div className="bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-150 dark:border-neutral-800/90 overflow-hidden text-neutral-900 dark:text-neutral-100 shadow-lg">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Standard</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 h-10">
                Everything you need to get started as a small business
              </p>
            </div>

            {/* Price display */}
            <div className="mb-6">
              {isCustomTier ? (
                <div className="text-3xl font-bold">Custom</div>
              ) : (
                <div>
                  <span className="text-3xl font-bold">
                    ${isAnnual ? Math.round(standardAnnualPrice / 12) : standardMonthlyPrice}
                  </span>
                  <span className="ml-1 text-neutral-600 dark:text-neutral-400">/month</span>
                </div>
              )}
            </div>

            {/* Subscribe button */}
            <button
              onClick={() => handleSubscribe("standard")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : isCustomTier ? "Contact us" : "Get started"}
            </button>

            {/* Features */}
            <FeaturesList features={STANDARD_FEATURES} />
          </div>
        </div>

        {/* Pro Plan Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border-2 border-emerald-500 overflow-hidden text-neutral-900 dark:text-neutral-100 shadow-lg">
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">Pro</h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/30 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/40 dark:border-emerald-500/30">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 h-10">
                Advanced features for professional teams
              </p>
            </div>

            {/* Price display */}
            <div className="mb-6">
              {isCustomTier ? (
                <div className="text-3xl font-bold">Custom</div>
              ) : (
                <div>
                  <span className="text-3xl font-bold">
                    ${isAnnual ? Math.round(proAnnualPrice / 12) : proMonthlyPrice}
                  </span>
                  <span className="ml-1 text-neutral-600 dark:text-neutral-400">/month</span>
                </div>
              )}
            </div>

            {/* Subscribe button */}
            <button
              onClick={() => handleSubscribe("pro")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : isCustomTier ? "Contact us" : "Get started"}
            </button>

            {/* Features */}
            <FeaturesList features={PRO_FEATURES} />
          </div>
        </div>

        {/* Enterprise Plan Card */}
        <div className="bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-150 dark:border-neutral-800/90 overflow-hidden text-neutral-900 dark:text-neutral-100 shadow-lg">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 h-10">
                Advanced features for enterprise teams
              </p>
            </div>

            {/* Price display */}
            <div className="mb-6">
              <div className="text-3xl font-bold">Custom</div>
            </div>

            {/* Contact button */}
            <a href="https://www.rybbit.com/contact" className="w-full block">
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer">
                Contact us
              </button>
            </a>

            {/* Features */}
            <FeaturesList features={ENTERPRISE_FEATURES} />
          </div>
        </div>
      </div>
    </div>
  );
}
