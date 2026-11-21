"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { authedFetch } from "@/api/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useCanInOrg } from "@/hooks/usePermissions";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { cn } from "@/lib/utils";

// The billing portal sends the owner back to the billing page with this set to the
// organization whose card they just changed.
const CARD_UPDATED_PARAM = "card_updated";

/** Where the portal's card form should return to, so the new card is charged on arrival. */
export function cardUpdatedReturnUrl(organizationId: string): string {
  const returnUrl = new URL("/settings/billing", window.location.origin);
  returnUrl.searchParams.set(CARD_UPDATED_PARAM, organizationId);
  return returnUrl.toString();
}

/**
 * Shown while Stripe is retrying a failed charge on the organization's plan. Owners get a
 * button to the billing portal's card form; everyone else is told who can fix it.
 */
export function PaymentFailedNotice({ organizationId, className }: { organizationId?: string; className?: string }) {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription(organizationId);
  const canManageBilling = useCanInOrg("billing:manage", organizationId);
  const [isOpening, setIsOpening] = useState(false);

  if (!organizationId || !subscription?.pastDue) return null;

  const updateCard = async () => {
    setIsOpening(true);
    try {
      const { portalUrl } = await authedFetch<{ portalUrl: string }>("/stripe/create-portal-session", undefined, {
        method: "POST",
        data: { organizationId, returnUrl: cardUpdatedReturnUrl(organizationId), flowType: "payment_method_update" },
      });
      window.location.href = portalUrl;
    } catch {
      toast.error(t("Could not open billing portal."));
      setIsOpening(false);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-4 rounded-lg border border-red-300 bg-red-100/80 px-4 py-3 text-sm dark:border-red-400/30 dark:bg-red-900/20",
        className
      )}
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
      <span className="flex-1 font-medium text-red-700 dark:text-red-300">
        {t("We couldn't charge your card.")}{" "}
        {canManageBilling
          ? t("Update it and we'll charge it straight away.")
          : t("Ask your organization owner to update it.")}
      </span>
      {canManageBilling && (
        <Button variant="success" size="sm" onClick={updateCard} disabled={isOpening}>
          {t("Update card")}
        </Button>
      )}
    </div>
  );
}

/**
 * Back from the billing portal's card form: charge the open invoice on the new card now
 * instead of waiting for Stripe's next retry, and say how it went. The parameter leaves the URL
 * first, so a reload can't charge twice.
 */
export function useChargeUpdatedCard() {
  const t = useExtracted();
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const url = new URL(window.location.href);
    const organizationId = url.searchParams.get(CARD_UPDATED_PARAM);
    if (!organizationId) return;
    handled.current = true;
    url.searchParams.delete(CARD_UPDATED_PARAM);
    window.history.replaceState(null, "", url);

    authedFetch<{ status: "paid" | "failed" | "unchanged" | "none" }>("/stripe/retry-payment", undefined, {
      method: "POST",
      data: { organizationId },
    })
      .then(({ status }) => {
        if (status === "paid") toast.success(t("Payment went through. Your plan is back on."));
        if (status === "failed") toast.error(t("That card was declined too. Try another one."));
      })
      .catch(() => toast.error(t("We couldn't retry the payment. We'll try the new card again soon.")))
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: ["stripe-subscription"] });
      });
  }, [queryClient, t]);
}
