import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/const";
import { STRIPE_TIERS } from "@/lib/stripe";
import { EVENT_TIERS, findPriceForTier, formatEventTier } from "@/lib/subscription/planUtils";
import { usePreviewSubscriptionUpdate, useUpdateSubscription } from "@/lib/subscription/useSubscriptionMutations";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CheckoutModal } from "./CheckoutModal";
import { PlanChangePreviewDialog } from "./PlanChangePreviewDialog";
import { PlanRow } from "./PlanRow";

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanName?: string;
  hasActiveSubscription?: boolean;
}

function parseCurrentPlan(currentPlanName?: string) {
  if (!currentPlanName) return { tierIndex: 0, planType: "standard" as const, isAnnual: false };

  const isAnnual = currentPlanName.includes("-annual");
  const planType = currentPlanName.includes("pro") ? "pro" as const : "standard" as const;

  // Find current tier index by matching event count
  const currentTierIndex = STRIPE_TIERS.findIndex(tier => {
    const suffix = isAnnual ? "-annual" : "";
    const expectedName = `${planType}${tier.events >= 1_000_000 ? tier.events / 1_000_000 + "m" : tier.events / 1_000 + "k"}${suffix}`;
    return expectedName === currentPlanName;
  });

  return {
    tierIndex: currentTierIndex >= 0 ? currentTierIndex : 0,
    planType,
    isAnnual,
  };
}

export function PlanDialog({ open, onOpenChange, currentPlanName, hasActiveSubscription }: PlanDialogProps) {
  const defaults = useMemo(() => parseCurrentPlan(currentPlanName), [currentPlanName]);

  // Default to next tier up for existing subscribers
  const defaultTierIndex = hasActiveSubscription
    ? Math.min(defaults.tierIndex + 1, STRIPE_TIERS.length - 1)
    : 0;

  const [eventLimitIndex, setEventLimitIndex] = useState(defaultTierIndex);
  const [isAnnual, setIsAnnual] = useState(defaults.isAnnual);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro">(defaults.planType);
  const [showProrationDialog, setShowProrationDialog] = useState(false);
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);
  const [pendingPlanName, setPendingPlanName] = useState<string | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: activeOrg } = authClient.useActiveOrganization();
  const previewMutation = usePreviewSubscriptionUpdate();
  const updateMutation = useUpdateSubscription();

  const eventLimit = EVENT_TIERS[eventLimitIndex];

  const handleSelectPlan = async () => {
    if (!activeOrg) {
      toast.error("Please select an organization");
      return;
    }

    if (eventLimit === "Custom") return;

    const price = findPriceForTier(eventLimit, isAnnual ? "year" : "month", selectedPlan);
    if (!price) {
      toast.error("Could not find a matching plan.");
      return;
    }

    // Don't allow selecting the current plan
    if (currentPlanName === price.name) {
      toast.error("You are already on this plan.");
      return;
    }

    setPendingPriceId(price.priceId);
    setPendingPlanName(price.name);
    setIsLoading(true);

    try {
      const baseUrl = window.location.origin;

      if (hasActiveSubscription) {
        await previewMutation.mutateAsync({
          organizationId: activeOrg.id,
          newPriceId: price.priceId,
        });
        setShowProrationDialog(true);
      } else {
        const returnUrl = `${baseUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`;

        const response = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            priceId: price.priceId,
            returnUrl,
            organizationId: activeOrg.id,
            referral: window.Rewardful?.referral || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create checkout session.");
        }

        if (data.clientSecret) {
          setCheckoutClientSecret(data.clientSecret);
          onOpenChange(false);
        } else {
          throw new Error("Checkout session not received.");
        }
      }
    } catch (error: any) {
      toast.error(`${hasActiveSubscription ? "Failed to preview subscription" : "Checkout"} failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSubscriptionUpdate = async () => {
    if (!activeOrg || !pendingPriceId) return;

    try {
      await updateMutation.mutateAsync({
        organizationId: activeOrg.id,
        newPriceId: pendingPriceId,
      });
      window.location.reload();
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handlePreviewCancel = () => {
    setShowProrationDialog(false);
    previewMutation.reset();
    setPendingPriceId(null);
    setPendingPlanName(null);
  };

  const handlePreviewConfirm = async () => {
    setShowProrationDialog(false);
    if (pendingPriceId && pendingPlanName) {
      await confirmSubscriptionUpdate();
    }
  };

  // Check if the currently selected options match the user's current plan
  const isCurrentSelection = (() => {
    if (!currentPlanName || eventLimit === "Custom") return false;
    const price = findPriceForTier(eventLimit, isAnnual ? "year" : "month", selectedPlan);
    return price?.name === currentPlanName;
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Choose Your Plan</DialogTitle>
              {/* Monthly/Annual toggle */}
              <div className="relative flex bg-neutral-150 dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-750 rounded-full p-0.5 text-sm">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={cn(
                    "px-2.5 py-1 rounded-full transition-colors cursor-pointer",
                    !isAnnual
                      ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={cn(
                    "px-2.5 py-1 rounded-full transition-colors cursor-pointer",
                    isAnnual
                      ? "bg-white dark:bg-white/20 text-neutral-700 dark:text-neutral-100 font-medium"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  )}
                >
                  Annual
                </button>
                {isAnnual && (
                  <span className="absolute -top-3 -right-12 text-[10px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    4 months free
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Event slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  Monthly events
                </span>
                <span className="text-sm font-medium">
                  {eventLimit === "Custom"
                    ? "Custom"
                    : `${formatEventTier(eventLimit)} events`}
                </span>
              </div>
              <Slider
                value={[eventLimitIndex]}
                onValueChange={([val]) => setEventLimitIndex(val)}
                min={0}
                max={EVENT_TIERS.length - 1}
                step={1}
              />
              <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500">
                <span>{formatEventTier(EVENT_TIERS[0])}</span>
                <span>
                  {typeof EVENT_TIERS[EVENT_TIERS.length - 1] === "string"
                    ? EVENT_TIERS[EVENT_TIERS.length - 1]
                    : formatEventTier(EVENT_TIERS[EVENT_TIERS.length - 1])}
                </span>
              </div>
            </div>

            {/* Plan rows */}
            {eventLimit !== "Custom" ? (
              <div className="space-y-2">
                <PlanRow
                  plan="standard"
                  label="Standard"
                  description="Up to 5 sites, 3 team members, advanced features"
                  eventLimit={eventLimit}
                  isAnnual={isAnnual}
                  selectedPlan={selectedPlan}
                  onSelect={() => setSelectedPlan("standard")}
                  isCurrent={(() => {
                    const price = findPriceForTier(eventLimit, isAnnual ? "year" : "month", "standard");
                    return price?.name === currentPlanName;
                  })()}
                />
                <PlanRow
                  plan="pro"
                  label="Pro"
                  description="Unlimited sites, session replays"
                  eventLimit={eventLimit}
                  isAnnual={isAnnual}
                  selectedPlan={selectedPlan}
                  onSelect={() => setSelectedPlan("pro")}
                  isCurrent={(() => {
                    const price = findPriceForTier(eventLimit, isAnnual ? "year" : "month", "pro");
                    return price?.name === currentPlanName;
                  })()}
                />
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Need more than {formatEventTier(STRIPE_TIERS[STRIPE_TIERS.length - 1].events)} events? Contact us for a custom plan.
                </p>
                <a
                  href="mailto:hello@rybbit.com"
                  className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
                >
                  hello@rybbit.com
                </a>
              </div>
            )}

            {/* Action button */}
            {eventLimit !== "Custom" && (
              <Button
                className="w-full h-11"
                variant="success"
                onClick={handleSelectPlan}
                disabled={isLoading || previewMutation.isPending || isCurrentSelection}
              >
                {isLoading || previewMutation.isPending
                  ? "Loading..."
                  : isCurrentSelection
                    ? "Current Plan"
                    : hasActiveSubscription
                      ? "Change Plan"
                      : "Subscribe"}
                {!isLoading && !previewMutation.isPending && !isCurrentSelection && (
                  <ArrowRight className="ml-2 h-4 w-4" />
                )}
              </Button>
            )}

            {/* Features comparison link */}
            <div className="text-center">
              <a
                href="https://www.rybbit.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-neutral-100 text-sm underline"
              >
                View detailed feature comparison →
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PlanChangePreviewDialog
        open={showProrationDialog}
        onOpenChange={setShowProrationDialog}
        previewData={previewMutation.data?.preview || null}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
        isUpdating={updateMutation.isPending}
      />
      <CheckoutModal
        clientSecret={checkoutClientSecret}
        open={!!checkoutClientSecret}
        onOpenChange={(open) => { if (!open) setCheckoutClientSecret(null); }}
      />
    </>
  );
}
