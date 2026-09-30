import { ExternalLink } from "lucide-react";
import { useExtracted, useLocale } from "next-intl";
import { useState } from "react";
import { DangerRow, DangerZone, LedgerRow, LedgerRows, LedgerSection } from "@/app/settings/components/Ledger";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/const";
import { getPlanType, getStripePrices } from "@/lib/stripe";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { InvoicesSection } from "../components/InvoicesSection";
import { PlanDialog } from "../components/PlanDialog";
import { PlanAllowances, PlanSection } from "../components/PlanSection";
import { UsageHistorySection } from "../components/UsageHistorySection";
import { UsageSection } from "../components/UsageSection";
import { CancellationDialog } from "./CancellationDialog";

const DANGER_BUTTON =
  "text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-400";

export function PaidPlan() {
  const t = useExtracted();
  const locale = useLocale();
  const { data: activeSubscription } = useStripeSubscription();

  const { data: activeOrg } = authClient.useActiveOrganization();
  const organizationId = activeOrg?.id;

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);

  const createPortalSession = async (flowType?: string) => {
    if (!organizationId) {
      toast.error(t("No organization selected"));
      return;
    }

    setActionError(null);
    setIsProcessing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/stripe/create-portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          returnUrl: window.location.href,
          organizationId,
          flowType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("Failed to create portal session."));
      }

      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        throw new Error(t("Portal URL not received."));
      }
    } catch (err: any) {
      console.error("Portal Session Error:", err);
      const message = err.message || t("Could not open billing portal.");
      setActionError(message);
      toast.error(t("Error: {message}", { message }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePlan = () => setShowPlanDialog(true);
  const handleCancelSubscription = () => setShowCancellationDialog(true);

  if (!activeSubscription) {
    return null;
  }

  const isTrial = !!activeSubscription.isTrial;
  const trialDaysRemaining = activeSubscription.trialDaysRemaining || 0;
  const isAnnualPlan = activeSubscription.interval === "year";

  const stripePlan = getStripePrices().find(p => p.name === activeSubscription.planName);
  const planType = getPlanType(activeSubscription.planName);
  const planName = stripePlan ? `${planType} ${stripePlan.shortName}` : planType;

  const priceAmount = stripePlan
    ? new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(
        stripePlan.price
      )
    : null;
  const price = priceAmount
    ? stripePlan?.interval === "year"
      ? t("{price}/year", { price: priceAmount })
      : t("{price}/month", { price: priceAmount })
    : null;

  const periodEnd = activeSubscription.currentPeriodEnd
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(activeSubscription.currentPeriodEnd))
    : null;

  // What happens at the end of the current period, trial status folded in.
  const getStatusLine = () => {
    if (!periodEnd) return null;
    if (activeSubscription.cancelAtPeriodEnd) {
      return t("Cancels on {date}.", { date: periodEnd });
    }
    if (activeSubscription.status === "trialing") {
      return trialDaysRemaining > 0
        ? t("Your trial ends in {count, plural, one {# day} other {# days}}, on {date}.", {
            count: trialDaysRemaining,
            date: periodEnd,
          })
        : t("Your trial ends today. Upgrade to continue tracking.");
    }
    if (activeSubscription.status === "active") {
      return isAnnualPlan
        ? t("Renews annually on {date}.", { date: periodEnd })
        : t("Renews monthly on {date}.", { date: periodEnd });
    }
    return t("Status: {status}. Ends or renews on {date}.", { status: activeSubscription.status, date: periodEnd });
  };

  const getCancelConsequence = () => {
    // Without another plan the organization drops to the legacy free tier, which only sites created
    // before the free plan closed still get (FREE_PLAN_CUTOFF_DATE and DEFAULT_EVENT_LIMIT on the server).
    const after = t(
      "After that, unless the organization has another plan such as an AppSumo license, sites added since {cutoff} stop collecting new events and older sites drop to {limit} events a month. Data already collected is kept.",
      {
        cutoff: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
          new Date("2026-02-13T00:00:00Z")
        ),
        limit: (3000).toLocaleString(locale),
      }
    );
    if (!periodEnd) return after;
    if (activeSubscription.cancelAtPeriodEnd) {
      return `${t("{plan} is already set to cancel on {date}.", { plan: planName, date: periodEnd })} ${after}`;
    }
    if (isTrial) {
      return `${t("Your trial stays active until {date} and you won't be charged.", { date: periodEnd })} ${after}`;
    }
    return `${t("{plan} stays active until {date} and you won't be charged again.", { plan: planName, date: periodEnd })} ${after}`;
  };

  return (
    <>
      {actionError && <Alert variant="destructive">{actionError}</Alert>}
      <PlanDialog
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
        currentPlanName={activeSubscription.planName}
        hasActiveSubscription
      />
      {organizationId && (
        <CancellationDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          subscription={activeSubscription}
          organizationId={organizationId}
          onProceedToStripe={() => createPortalSession("subscription_cancel")}
          onChangePlan={handleChangePlan}
        />
      )}

      <PlanSection
        name={planName}
        price={price}
        description={
          isTrial ? t("Free trial.") : isAnnualPlan ? t("Billed annually, 4 months free.") : t("Billed monthly.")
        }
        status={getStatusLine()}
        details={<PlanAllowances subscription={activeSubscription} />}
        action={
          <Button variant="success" onClick={handleChangePlan}>
            {t("Change plan")}
          </Button>
        }
      />

      <UsageSection
        subscription={activeSubscription}
        planName={planType}
        overLimitAction={
          <Button variant="success" size="sm" onClick={handleChangePlan}>
            {t("Upgrade plan")}
          </Button>
        }
      />

      {organizationId && <UsageHistorySection organizationId={organizationId} />}

      <LedgerSection title={t("Payment")}>
        <LedgerRows>
          <LedgerRow label={t("Payment method")} description={t("Charged on each renewal.")}>
            <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {t("Your card and billing email are managed in Stripe.")}
              </p>
              <Button
                variant="outline"
                className="sm:ml-auto"
                onClick={() => createPortalSession("payment_method_update")}
                disabled={isProcessing}
              >
                {t("Manage in Stripe")}
                <ExternalLink aria-hidden className="size-3.5" />
              </Button>
            </div>
          </LedgerRow>
        </LedgerRows>
      </LedgerSection>

      <InvoicesSection />

      <DangerZone>
        <DangerRow
          label={isTrial ? t("Cancel trial") : t("Cancel subscription")}
          description={isTrial ? t("Takes effect when the trial ends.") : t("Takes effect when the period ends.")}
          consequence={getCancelConsequence()}
          action={
            <Button
              variant="ghost"
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className={DANGER_BUTTON}
            >
              {isTrial ? t("Cancel trial") : t("Cancel subscription")}
            </Button>
          }
        />
      </DangerZone>
    </>
  );
}
