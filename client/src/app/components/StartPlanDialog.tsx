"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { AuthError } from "@/components/auth/AuthError";
import { CheckoutModal } from "@/components/subscription/components/CheckoutModal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createCheckoutSession } from "@/lib/subscription/checkout";
import { EVENT_TIERS, findPriceForTier } from "@/lib/subscription/planUtils";
import { trackAdEvent } from "@/lib/trackAdEvent";
import { PlanStep } from "../signup/components/PlanStep";

/**
 * Picks a plan and opens embedded checkout for an organization that has none: the signup
 * plan step in a dialog. Stripe returns the customer to `returnPath`. `onDone` runs once the
 * flow is over, whether it ended in checkout or the person closed it.
 */
export function StartPlanDialog({
  open,
  onOpenChange,
  organizationId,
  returnPath,
  trialEligible,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  returnPath: string;
  trialEligible: boolean;
  onDone?: () => void;
}) {
  const t = useExtracted();
  const [eventLimitIndex, setEventLimitIndex] = useState(0);
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro">("pro");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);

  const handleSubscribe = async () => {
    const eventLimit = EVENT_TIERS[eventLimitIndex];
    if (eventLimit === "Custom") return;

    const price = findPriceForTier(eventLimit, isAnnual ? "year" : "month", selectedPlan);
    if (!price) {
      setError(t("Could not find a matching plan. Please try a different selection."));
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const clientSecret = await createCheckoutSession({ priceId: price.priceId, organizationId, returnPath });
      trackAdEvent("checkout", { tier: price.name });
      setCheckoutClientSecret(clientSecret);
      onOpenChange(false);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : String(checkoutError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={next => {
          onOpenChange(next);
          if (!next && !checkoutClientSecret) onDone?.();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">{t("Choose your plan")}</DialogTitle>
          <div className="flex flex-col gap-4">
            <PlanStep
              eventLimitIndex={eventLimitIndex}
              setEventLimitIndex={setEventLimitIndex}
              isAnnual={isAnnual}
              setIsAnnual={setIsAnnual}
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              onSubscribe={handleSubscribe}
              isLoading={isLoading}
              trialEligible={trialEligible}
            />
            <AuthError error={error} />
          </div>
        </DialogContent>
      </Dialog>
      <CheckoutModal
        clientSecret={checkoutClientSecret}
        open={!!checkoutClientSecret}
        onOpenChange={next => {
          if (!next) {
            setCheckoutClientSecret(null);
            onDone?.();
          }
        }}
      />
    </>
  );
}
