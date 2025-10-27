import React, { useState } from "react";
import { Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BACKEND_URL } from "@/lib/const";
import { authClient } from "@/lib/auth";
import {
  EVENT_TIERS,
  STANDARD_FEATURES,
  PRO_FEATURES,
  FREE_FEATURES,
  findPriceForTier,
  formatEventTier,
} from "./utils";
import { trackAdEvent } from "../../../lib/trackAdEvent";

export function PricingCard({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [eventLimitIndex, setEventLimitIndex] = useState<number>(0);
  const [isAnnual, setIsAnnual] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data: activeOrg } = authClient.useActiveOrganization();

  const eventLimit = EVENT_TIERS[eventLimitIndex];

  // Handle subscription for a specific plan type
  async function handleSubscribe(planType: "standard" | "pro"): Promise<void> {
    // Handle custom tier by redirecting to email contact
    if (eventLimit === "Custom") {
      window.location.href = "https://www.rybbit.io/contact";
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
      const cancelUrl = `${baseUrl}/subscribe`;

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
              {formatEventTier(tier)}
            </span>
          ))}
        </div>
      </div>

      {/* Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Free Plan Card */}
        <div className="bg-neutral-800/15 rounded-xl border border-neutral-700/60 overflow-hidden text-neutral-300">
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

            {/* Current plan button */}
            <button
              disabled
              className="w-full bg-neutral-700/50 text-neutral-400 font-medium px-5 py-3 rounded-xl border border-neutral-600/50 cursor-not-allowed opacity-50"
            >
              Current Plan
            </button>

            {/* Features */}
            <div className="space-y-4 mt-6">
              {FREE_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center">
                  <Check className="h-4 w-4 text-emerald-400 mr-3 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Standard Plan Card */}
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Standard</h3>
              <p className="text-sm text-neutral-400">Everything you need to get started</p>
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
                  <span className="ml-1 text-neutral-400">/month</span>
                </div>
              )}
            </div>

            {/* Subscribe button */}
            <button
              onClick={() => handleSubscribe("standard")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : isCustomTier ? "Contact us" : "Get Standard"}
            </button>

            {/* Features */}
            <div className="space-y-4 mt-6">
              {STANDARD_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center">
                  <Check className="h-4 w-4 text-emerald-400 mr-3 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pro Plan Card */}
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-sm text-neutral-400">Advanced features for professional teams</p>
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
                  <span className="ml-1 text-neutral-400">/month</span>
                </div>
              )}
            </div>

            {/* Subscribe button */}
            <button
              onClick={() => handleSubscribe("pro")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : isCustomTier ? "Contact us" : "Get Pro"}
            </button>

            {/* Features */}
            <div className="space-y-4 mt-6">
              {PRO_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center">
                  <Check className="h-4 w-4 text-emerald-400 mr-3 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer text */}
      <p className="text-center text-sm text-neutral-400 mt-6">
        {isCustomTier ? "Email us at hello@rybbit.io for custom pricing" : "Secure checkout powered by Stripe."}
      </p>
    </div>
  );
}
