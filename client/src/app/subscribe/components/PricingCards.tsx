"use client";

import { PricingCard } from "@/components/pricing/PricingCard";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/const";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { trackAdEvent } from "../../../lib/trackAdEvent";
import {
  BASIC_FEATURES,
  ENTERPRISE_FEATURES,
  EVENT_TIERS,
  PRO_FEATURES,
  STANDARD_FEATURES,
  findPriceForTier,
  formatEventTier
} from "./utils";

import { CheckoutModal } from "@/components/subscription/CheckoutModal";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";

export function PricingCards({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useExtracted();
  const [siteId] = useQueryState("siteId");
  const router = useRouter();

  const [eventLimitIndex, setEventLimitIndex] = useState<number>(0);
  const [isAnnual, setIsAnnual] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTestPlan, setShowTestPlan] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const { data: activeOrg } = authClient.useActiveOrganization();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "D" && e.shiftKey) {
        setShowTestPlan((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const eventLimit = EVENT_TIERS[eventLimitIndex];

  // Handle subscription for a specific plan type
  async function handleSubscribe(planType: "basic" | "standard" | "pro"): Promise<void> {
    // Handle custom tier by redirecting to email contact
    if (eventLimit === "Custom") {
      window.location.href = "https://www.rybbit.com/contact";
      return;
    }

    // Check if user is logged in directly
    if (!isLoggedIn) {
      toast.error(t("Please log in to subscribe."));
      return;
    }

    // Check if user has an active organization
    if (!activeOrg) {
      toast.error(t("Please select an organization to subscribe."));
      return;
    }

    const selectedTierPrice = findPriceForTier(eventLimit, isAnnual ? "year" : "month", planType);

    if (!selectedTierPrice) {
      toast.error(t("Selected pricing plan not found. Please adjust the slider."));
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = window.location.origin;
      const returnUrl = siteId
        ? `${baseUrl}/${siteId}?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/settings/organization/subscription?session_id={CHECKOUT_SESSION_ID}`;

      const response = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Send cookies
        body: JSON.stringify({
          priceId: selectedTierPrice.priceId,
          returnUrl,
          organizationId: activeOrg.id,
          referral: window.Rewardful?.referral || undefined,
        }),
      });

      const data = await response.json();
      trackAdEvent("checkout", { tier: selectedTierPrice.name });

      if (!response.ok) {
        throw new Error(data.error || t("Failed to create checkout session."));
      }

      if (data.clientSecret) {
        setCheckoutClientSecret(data.clientSecret);
      } else {
        throw new Error(t("Checkout session not received."));
      }
      setIsLoading(false);
    } catch (error: any) {
      toast.error(t("Subscription failed: {message}", { message: error.message }));
      setIsLoading(false); // Stop loading on error
    }
  }

  async function handleTestSubscribe(): Promise<void> {
    if (!isLoggedIn) {
      toast.error(t("Please log in to subscribe."));
      return;
    }
    if (!activeOrg) {
      toast.error(t("Please select an organization to subscribe."));
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = window.location.origin;
      const returnUrl = siteId
        ? `${baseUrl}/${siteId}?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/settings/organization/subscription?session_id={CHECKOUT_SESSION_ID}`;

      const response = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId: "price_1SzT8pDFVprnAny2EdkqxRAZ",
          returnUrl,
          organizationId: activeOrg.id,
          referral: window.Rewardful?.referral || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("Failed to create checkout session."));
      }

      if (data.clientSecret) {
        setCheckoutClientSecret(data.clientSecret);
      } else {
        throw new Error(t("Checkout session not received."));
      }
      setIsLoading(false);
    } catch (error: any) {
      toast.error(t("Subscription failed: {message}", { message: error.message }));
      setIsLoading(false);
    }
  }

  // Handle slider changes
  function handleSliderChange(value: number[]): void {
    setEventLimitIndex(value[0]);
  }

  // Get pricing information for all plans
  const basicMonthlyPrice = findPriceForTier(eventLimit, "month", "basic")?.price || 0;
  const basicAnnualPrice = findPriceForTier(eventLimit, "year", "basic")?.price || 0;
  const isBasicAvailable = typeof eventLimit === "number" && eventLimit <= 250_000;
  const standardMonthlyPrice = findPriceForTier(eventLimit, "month", "standard")?.price || 0;
  const standardAnnualPrice = findPriceForTier(eventLimit, "year", "standard")?.price || 0;
  const proMonthlyPrice = findPriceForTier(eventLimit, "month", "pro")?.price || 0;
  const proAnnualPrice = findPriceForTier(eventLimit, "year", "pro")?.price || 0;
  const isCustomTier = eventLimit === "Custom";

  return (
    <>
      <CheckoutModal
        clientSecret={checkoutClientSecret}
        open={!!checkoutClientSecret}
        onOpenChange={(open) => { if (!open) setCheckoutClientSecret(null); }}
      />
      <div className="max-w-[1300px] mx-auto">
        {/* Shared controls section */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="flex justify-between mb-6 items-center">
            <div>
              <h3 className="font-semibold mb-2">{t("Monthly pageviews")}</h3>
              <div className="text-3xl font-bold text-emerald-400">
                {typeof eventLimit === "number" ? eventLimit.toLocaleString() : eventLimit}
              </div>
            </div>
            <div className="flex flex-col items-end">
              {/* Billing toggle */}
              <div className="relative flex items-center">
                <div className="flex bg-neutral-150 dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-750 rounded-full p-1 text-sm">
                  <button
                    onClick={() => setIsAnnual(false)}
                    className={cn(
                      "px-3 py-1 rounded-full transition-colors cursor-pointer",
                      !isAnnual
                        ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                    )}
                  >
                    {t("Monthly")}
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    className={cn(
                      "px-3 py-1 rounded-full transition-colors cursor-pointer",
                      isAnnual
                        ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                    )}
                  >
                    {t("Annual")}
                  </button>
                </div>
                <span className="absolute -top-3 -right-12 text-xs text-white bg-emerald-500 border border-emerald-500 rounded-full px-2 py-0.5 whitespace-nowrap">
                  {t("4 months free")}
                </span>
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
                {index === EVENT_TIERS.length - 1 && typeof tier !== "number"
                  ? "20M+"
                  : formatEventTier(tier)}
              </span>
            ))}
          </div>
        </div>

        {/* Cards section */}
        <div className="grid min-[1100px]:grid-cols-4 min-[700px]:grid-cols-2 min-[400px]:grid-cols-1 gap-4 mx-auto mb-16">
          <div className={cn("h-full", !isBasicAvailable && "opacity-60")}>
            <PricingCard
              title="Basic"
              description={t("For personal projects and small sites")}
              monthlyPrice={basicMonthlyPrice}
              annualPrice={basicAnnualPrice}
              isAnnual={isAnnual}
              isCustomTier={!isBasicAvailable}
              customPriceLabel="-"
              buttonText={!isBasicAvailable ? t("Up to 250k only") : isLoading ? t("Processing...") : t("Start free trial")}
              features={BASIC_FEATURES}
              onClick={() => handleSubscribe("basic")}
              disabled={isLoading || !isBasicAvailable}
            />
          </div>
          <PricingCard
            title="Standard"
            description={t("Everything you need to get started as a small business")}
            monthlyPrice={standardMonthlyPrice}
            annualPrice={standardAnnualPrice}
            isAnnual={isAnnual}
            isCustomTier={isCustomTier}
            buttonText={isLoading ? t("Processing...") : isCustomTier ? t("Contact us") : t("Start free trial")}
            features={STANDARD_FEATURES}
            onClick={() => handleSubscribe("standard")}
            disabled={isLoading}
          />
          <PricingCard
            title="Pro"
            description={t("Advanced features for professional teams")}
            isCustomTier={isCustomTier}
            monthlyPrice={proMonthlyPrice}
            annualPrice={proAnnualPrice}
            isAnnual={isAnnual}
            buttonText={isLoading ? t("Processing...") : isCustomTier ? t("Contact us") : t("Start free trial")}
            features={PRO_FEATURES}
            recommended={true}
            onClick={() => handleSubscribe("pro")}
            disabled={isLoading}
          />

          {showTestPlan && (
            <PricingCard
              title="Test"
              description={t("$1 test subscription for development")}
              isCustomTier={isCustomTier}
              buttonText={isLoading ? t("Processing...") : t("Subscribe ($1)")}
              features={["Test plan"]}
              onClick={() => handleTestSubscribe()}
              disabled={isLoading}
            />
          )}

          <PricingCard
            title="Enterprise"
            description={t("Advanced features for enterprise teams")}
            features={ENTERPRISE_FEATURES}
            isCustomTier={true}
            customButton={
              <a href="https://www.rybbit.com/contact" className="w-full block">
                <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer">
                  {t("Contact us")}
                </button>
              </a>
            }
          />
        </div>
      </div>
    </>
  );
}
