"use client";

import { useState } from "react";
import Cal from "@calcom/embed-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, BarChart3, ArrowRight } from "lucide-react";
import { SubscriptionData } from "@/lib/subscription/useStripeSubscription";
import {
  useSubmitCancellationFeedback,
} from "@/lib/subscription/useCancellationFeedback";
import { getPlanType, getStripePrices } from "@/lib/stripe";
import { toast } from "@/components/ui/sonner";

type CancellationReason =
  | "too_expensive"
  | "missing_features"
  | "not_using"
  | "too_complex"
  | "switching_competitor"
  | "other";

const REASONS: { value: CancellationReason; label: string }[] = [
  { value: "too_expensive", label: "It's too expensive" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "not_using", label: "I'm not using it enough" },
  { value: "too_complex", label: "It's too hard to set up or use" },
  { value: "switching_competitor", label: "Switching to another tool" },
  { value: "other", label: "Other reason" },
];

const DETAIL_REASONS: CancellationReason[] = [
  "missing_features",
  "switching_competitor",
  "other",
];

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionData;
  organizationId: string;
  onProceedToStripe: () => void;
  onChangePlan: () => void;
}

export function CancellationDialog({
  open,
  onOpenChange,
  subscription,
  organizationId,
  onProceedToStripe,
  onChangePlan,
}: CancellationDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [reasonDetails, setReasonDetails] = useState("");
  const submitFeedback = useSubmitCancellationFeedback();

  const isTrial = !!subscription.isTrial;
  const isMonthly = subscription.interval === "month";
  const stripePlan = getStripePrices().find(
    (p) => p.name === subscription.planName
  );
  const planType = getPlanType(subscription.planName);

  const resetAndClose = () => {
    setStep(1);
    setReason("");
    setReasonDetails("");
    onOpenChange(false);
  };

  const feedbackPayload = (offerShown: string, accepted: boolean, outcome: string) => ({
    organizationId,
    reason: reason as string,
    reasonDetails: reasonDetails || undefined,
    retentionOfferShown: offerShown,
    retentionOfferAccepted: accepted,
    outcome,
    planNameAtCancellation: subscription.planName,
    monthlyEventCountAtCancellation: subscription.monthlyEventCount,
  });

  const handleKeepPlan = (offerShown: string) => {
    submitFeedback.mutate(feedbackPayload(offerShown, true, "retained"), {
      onSettled: () => {
        toast.success("Great, we're glad you're staying!");
        resetAndClose();
      },
    });
  };

  const handleSwitchToAnnual = () => {
    submitFeedback.mutate(feedbackPayload("switch_annual", true, "retained"), {
      onSettled: () => {
        resetAndClose();
        onChangePlan();
      },
    });
  };

  const handleDowngrade = () => {
    submitFeedback.mutate(feedbackPayload("downgrade", true, "retained"), {
      onSettled: () => {
        resetAndClose();
        onChangePlan();
      },
    });
  };

  const handleFinalCancel = () => {
    submitFeedback.mutate(feedbackPayload(getRetentionOfferType(), false, "cancelled"));
    onProceedToStripe();
  };

  const getRetentionOfferType = (): string => {
    if (!reason) return "none";
    if (reason === "too_expensive" && isMonthly && !isTrial) return "switch_annual";
    if (reason === "too_expensive") return "downgrade";
    if (reason === "missing_features") return "feature_request";
    if (reason === "not_using") return "setup_help";
    if (reason === "too_complex") return "setup_help";
    return "general";
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        We'd love to understand why you're leaving so we can improve.
      </p>
      <RadioGroup
        value={reason}
        onValueChange={(v) => setReason(v as CancellationReason)}
      >
        {REASONS.map((r) => (
          <div key={r.value} className="flex items-center space-x-3">
            <RadioGroupItem value={r.value} id={r.value} />
            <Label
              htmlFor={r.value}
              className="text-sm font-normal cursor-pointer"
            >
              {r.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {reason && DETAIL_REASONS.includes(reason) && (
        <Textarea
          placeholder={
            reason === "missing_features"
              ? "What features are you looking for?"
              : reason === "switching_competitor"
                ? "Which tool are you switching to?"
                : "Tell us more..."
          }
          value={reasonDetails}
          onChange={(e) => setReasonDetails(e.target.value)}
          className="mt-2"
          rows={3}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={resetAndClose}>
          Never mind
        </Button>
        <Button
          variant="default"
          disabled={!reason}
          onClick={() => setStep(2)}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const renderTooExpensiveOffer = () => {
      if (isMonthly && !isTrial) {
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
              <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                Switch to annual and save 33%
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Pay for 8 months and get 12. That's 4 months free with annual
                billing.
              </p>
              <Button
                variant="success"
                className="mt-3"
                onClick={handleSwitchToAnnual}
              >
                Switch to Annual Billing
              </Button>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">
              Downgrade to a smaller plan
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You can switch to a more affordable plan that better fits your
              needs.
            </p>
            <Button variant="default" className="mt-3" onClick={handleDowngrade}>
              View Plans
            </Button>
          </div>
        </div>
      );
    };

    const renderMissingFeaturesOffer = () => (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">
            We hear you
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Your feedback has been recorded and will help us prioritize our
            roadmap. We'd love for you to stay and see the improvements.
          </p>
          <Button
            variant="default"
            className="mt-3"
            onClick={() => handleKeepPlan("feature_request")}
          >
            Keep My Plan
          </Button>
        </div>
      </div>
    );

    const renderTooComplexOffer = () => (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">
            Book a free setup session
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            We'd love to help you get the most out of Rybbit. Book a free
            30-minute call and our team will help you get set up.
          </p>
          <Cal
            namespace="cancellation-setup"
            calLink="rybbit/30min"
            style={{ width: "100%", height: "400px", overflow: "auto" }}
            config={{
              layout: "month_view",
              theme: "dark",
            }}
          />
          <Button
            variant="default"
            className="mt-3"
            onClick={() => handleKeepPlan("setup_help")}
          >
            Keep My Plan
          </Button>
        </div>
      </div>
    );

    const renderGenericOffer = () => (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">
            Is there anything we can do?
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            We're sorry to see you go. If there's anything we can do to improve
            your experience, we'd love to hear about it.
          </p>
          <Button
            variant="default"
            className="mt-3"
            onClick={() => handleKeepPlan("general")}
          >
            Keep My Plan
          </Button>
        </div>
      </div>
    );

    const renderOffer = () => {
      switch (reason) {
        case "too_expensive":
          return renderTooExpensiveOffer();
        case "missing_features":
          return renderMissingFeaturesOffer();
        case "not_using":
        case "too_complex":
          return renderTooComplexOffer();
        case "switching_competitor":
        case "other":
        default:
          return renderGenericOffer();
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Before you go, we'd like to offer an alternative:
        </p>
        {renderOffer()}
        <div className="flex justify-end pt-2">
          <button
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 underline underline-offset-2"
            onClick={() => setStep(3)}
          >
            No thanks, continue cancelling
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const price = stripePlan
      ? `$${stripePlan.price}/${stripePlan.interval === "year" ? "yr" : "mo"}`
      : null;

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-red-800 dark:text-red-300">
                Here's what you'll lose
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1.5">
                <li className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  {subscription.eventLimit.toLocaleString()} events/
                  {subscription.interval === "year" ? "year" : "month"} on the{" "}
                  {planType} plan
                  {price && <span className="text-neutral-500">({price})</span>}
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  {subscription.monthlyEventCount.toLocaleString()} events
                  tracked this month
                </li>
              </ul>
              <p className="text-sm text-red-700 dark:text-red-400 pt-1">
                Your analytics data will no longer be collected after
                cancellation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="success" onClick={resetAndClose}>
            Keep My Plan
          </Button>
          <Button
            variant="destructive"
            onClick={handleFinalCancel}
            disabled={submitFeedback.isPending}
          >
            {submitFeedback.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : isTrial ? (
              "Cancel Trial"
            ) : (
              "Cancel My Subscription"
            )}
          </Button>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    if (step === 1)
      return isTrial
        ? "Why are you cancelling your trial?"
        : "Why are you leaving?";
    if (step === 2) return "Before you go...";
    return "Are you sure?";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetAndClose();
        else onOpenChange(o);
      }}
    >
      <DialogContent className={step === 2 && reason === "too_complex" ? "max-w-2xl" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </DialogContent>
    </Dialog>
  );
}
