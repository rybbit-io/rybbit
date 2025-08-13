import React, { useState } from "react";
import { Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BACKEND_URL } from "@/lib/const";
import { authClient } from "@/lib/auth";
import { EVENT_TIERS, PRO_FEATURES, StripePrice, findPriceForTier, formatEventTier } from "./utils";

interface PricingCardProps {
  stripePrices: StripePrice[];
  isLoggedIn: boolean;
}

export function PricingCard({ stripePrices, isLoggedIn }: PricingCardProps) {
  const [eventLimitIndex, setEventLimitIndex] = useState<number>(0);
  const [isAnnual, setIsAnnual] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data: activeOrg } = authClient.useActiveOrganization();

  const eventLimit = EVENT_TIERS[eventLimitIndex];

  // Handle subscription
  async function handleSubscribe(): Promise<void> {
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

    const selectedTierPrice = findPriceForTier(eventLimit, isAnnual ? "year" : "month", stripePrices);

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

  // Get pricing information
  const monthlyPrice = findPriceForTier(eventLimit, "month", stripePrices)?.price || 0;
  const annualPrice = findPriceForTier(eventLimit, "year", stripePrices)?.price || 0;
  const isCustomTier = eventLimit === "Custom";

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
        <div className="p-6">
          {/* Slider section */}
          <div className="mb-6">
            <div className="flex justify-between mb-3 items-center">
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
                <div className="text-right h-10">
                  {isCustomTier ? (
                    <></>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">
                        ${isAnnual ? Math.round(annualPrice / 12) : monthlyPrice}
                      </span>
                      <span className="ml-1 text-neutral-400">/month</span>
                    </>
                  )}
                </div>
              </div>
            </div>

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

          <div className="space-y-4 mb-6">
            {PRO_FEATURES.map((feature, i) => (
              <div key={i} className="flex items-center">
                <Check className="h-4 w-4 text-emerald-400 mr-3 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : isCustomTier ? "Contact us" : "Subscribe Now"}
          </button>

          <p className="text-center text-sm text-neutral-400 mt-4">
            {isCustomTier ? "Email us at hello@rybbit.io for custom pricing" : "Secure checkout powered by Stripe."}
          </p>
        </div>
      </div>
    </div>
  );
}
