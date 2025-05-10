"use client";

import { Slider } from "@/components/ui/slider";
import { authClient } from "@/lib/auth";
import { getStripePrices } from "@/lib/stripe";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StandardPage } from "../../components/StandardPage";
import { BACKEND_URL } from "../../lib/const";
import { cn } from "../../lib/utils";
import { useStripeSubscription } from "../settings/subscription/utils/useStripeSubscription";

// Available event tiers for the slider
const EVENT_TIERS = [
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_000_000,
  5_000_000,
  10_000_000,
  "Custom",
];

// Define plan features
const PRO_FEATURES = [
  "Unlimited websites",
  "Unlimited team members",
  "Real-time analytics",
  "Custom events",
  "Funnels & user flows",
  "All features",
];

interface StripePrice {
  priceId: string;
  price: number;
  name: string;
  interval: string;
  limits: {
    events: number;
  };
}

// Find the appropriate price for a tier at current event limit
function findPriceForTier(
  eventLimit: number | string,
  interval: "month" | "year"
): StripePrice | null {
  // Check if we have a custom tier
  if (eventLimit === "Custom") {
    return null;
  }

  // Convert eventLimit to number to ensure type safety
  const eventLimitValue = Number(eventLimit);

  // Determine if we need to look for annual plans
  const isAnnual = interval === "year";

  // Filter plans by name pattern (with or without -annual suffix) and interval
  const plans = getStripePrices().filter(
    (plan) =>
      (isAnnual
        ? plan.name.startsWith("pro") && plan.name.includes("-annual")
        : plan.name.startsWith("pro") && !plan.name.includes("-annual")) &&
      plan.interval === interval
  );

  // Find a plan that matches or exceeds the event limit
  const matchingPlan = plans.find(
    (plan) => plan.limits.events >= eventLimitValue
  );
  const selectedPlan = matchingPlan || plans[plans.length - 1] || null;

  // Return the matching plan or the highest tier available
  return selectedPlan;
}

export default function Subscribe() {
  const [eventLimitIndex, setEventLimitIndex] = useState<number>(0); // Default to 100k (index 0)
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data: sessionData } = authClient.useSession();

  const eventLimit = EVENT_TIERS[eventLimitIndex];

  // Handle subscription
  async function handleSubscribe(): Promise<void> {
    // Handle custom tier by redirecting to email contact
    if (eventLimit === "Custom") {
      window.location.href = "https://www.rybbit.io/contact";
      return;
    }

    // Check if user is logged in directly
    if (!sessionData?.user) {
      toast.error("Please log in to subscribe.");
      return;
    }

    const selectedTierPrice = findPriceForTier(
      eventLimit,
      isAnnual ? "year" : "month"
    );

    if (!selectedTierPrice) {
      toast.error("Selected pricing plan not found. Please adjust the slider.");
      return;
    }

    setIsLoading(true);
    try {
      // Use NEXT_PUBLIC_BACKEND_URL if available, otherwise use relative path for same-origin requests
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/settings/subscription?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/subscribe`;

      const response = await fetch(
        `${BACKEND_URL}/stripe/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Send cookies
          body: JSON.stringify({
            priceId: selectedTierPrice.priceId,
            successUrl: successUrl,
            cancelUrl: cancelUrl,
          }),
        }
      );

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
  const monthlyPrice = findPriceForTier(eventLimit, "month")?.price || 0;
  const annualPrice = findPriceForTier(eventLimit, "year")?.price || 0;
  const isCustomTier = eventLimit === "Custom";

  const { data: subscription } = useStripeSubscription();
  const router = useRouter();
  if (subscription?.status === "active") {
    router.push("/settings/subscription");
  }

  return (
    <StandardPage>
      <div className="container mx-auto py-12 px-4">
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight pb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-400">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-neutral-300 mb-6">
            Privacy-friendly analytics with all the features you need to grow
          </p>
        </div>

        {/* Pricing card */}
        <div className="max-w-lg mx-auto">
          <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
            <div className="p-6">
              {/* Slider section */}
              <div className="mb-6">
                <div className="flex justify-between mb-3 items-center">
                  <div>
                    <h3 className="font-semibold mb-2">Events per month</h3>
                    <div className="text-3xl font-bold text-emerald-400">
                      {typeof eventLimit === "number"
                        ? eventLimit.toLocaleString()
                        : eventLimit}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {/* Billing toggle */}
                    <div className="flex gap-3 mb-2 text-sm">
                      <button
                        onClick={() => setIsAnnual(false)}
                        className={cn("px-3 py-1 rounded-full transition-colors cursor-pointer", !isAnnual ? "bg-emerald-500/20 text-emerald-400 font-medium" : "text-neutral-400 hover:text-neutral-200")}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setIsAnnual(true)}
                        className={cn("px-3 py-1 rounded-full transition-colors cursor-pointer", isAnnual ? "bg-emerald-500/20 text-emerald-400 font-medium" : "text-neutral-400 hover:text-neutral-200")}
                      >
                        Annual
                        <span className="ml-1 text-xs text-emerald-500">
                          -17%
                        </span>
                      </button>
                    </div>
                    <div className="text-right h-10">
                      {isCustomTier ? (
                        <></>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">
                            $
                            {isAnnual
                              ? Math.round(annualPrice / 12)
                              : monthlyPrice}
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
                    <span
                      key={index}
                      className={cn(eventLimitIndex === index && "font-bold text-emerald-400")}
                    >
                      {typeof tier === "string"
                        ? tier
                        : tier >= 1_000_000
                        ? `${tier / 1_000_000}M`
                        : `${tier / 1_000}K`}
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
                {isLoading
                  ? "Processing..."
                  : isCustomTier
                  ? "Contact us"
                  : "Subscribe Now"}
              </button>

              <p className="text-center text-sm text-neutral-400 mt-4">
                {isCustomTier
                  ? "Email us at hello@rybbit.io for custom pricing"
                  : "Secure checkout powered by Stripe."}
              </p>
            </div>
          </div>

          {/* FAQ section */}
          <div className="mt-10 space-y-6">
            <h3 className="text-xl font-semibold mb-4">
              Frequently Asked Questions
            </h3>

            <div className="bg-neutral-800/20 p-5 rounded-lg border border-neutral-700">
              <h4 className="font-medium mb-2">What counts as an event?</h4>
              <p className="text-neutral-300">
                An event is either a pageview or a custom event that you create
                on your website. Pageviews are tracked automatically, while
                custom events can be defined to track specific user
                interactions.
              </p>
            </div>

            <div className="bg-neutral-800/20 p-5 rounded-lg border border-neutral-700">
              <h4 className="font-medium mb-2">Can I change my plan later?</h4>
              <p className="text-neutral-300">
                Absolutely. You can upgrade, downgrade, or cancel your plan at
                any time through your account settings.
              </p>
            </div>

            <div className="bg-neutral-800/20 p-5 rounded-lg border border-neutral-700">
              <h4 className="font-medium mb-2">
                What happens if I go over my event limit?
              </h4>
              <p className="text-neutral-300">
                We'll notify you when you're approaching your limit. You can
                either upgrade to a higher plan or continue with your current
                plan (events beyond the limit won't be tracked).
              </p>
            </div>
          </div>
        </div>
      </div>
    </StandardPage>
  );
}
