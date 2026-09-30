"use client";

import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useOrganizationMembers } from "@/api/admin/hooks/useOrganizationMembers";
import { useUserOrganizations } from "@/api/admin/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { cn } from "@/lib/utils";

// Code-split: @stripe/stripe-js injects Stripe.js as soon as it is imported, and these
// prompts render on the home page and every dashboard page. Mount it only once someone
// starts choosing a plan.
export const LazyStartPlanDialog = dynamic(() => import("./StartPlanDialog").then(mod => mod.StartPlanDialog), {
  ssr: false,
});

/**
 * Who is looking at an organization with no plan, and what they can do about it. Only the
 * owner can start checkout (the server enforces it). An organization that already had a
 * subscription is offered plans, not another trial.
 */
export function usePlanPrompt(organizationId: string | undefined) {
  const { data: organizations, isLoading: isLoadingOrganizations } = useUserOrganizations();
  // This organization's subscription, not the active one's: a dashboard can belong to another
  // organization the person is in, and only that one's history decides whether a trial is on offer.
  const { data: subscription, isLoading: isLoadingSubscription } = useStripeSubscription(organizationId);
  const role = organizations?.find(org => org.id === organizationId)?.role;
  return {
    isLoading: isLoadingOrganizations || isLoadingSubscription,
    isOwner: role === "owner",
    trialEligible: subscription?.trialEligible !== false,
  };
}

// Longer than the server's 60-second per-worker subscription cache, so the polling below
// outlasts any cached "no plan" answer from before checkout.
const CHECKOUT_RETURN_WINDOW_MS = 2 * 60_000;

/**
 * True for two minutes after Stripe checkout sends someone back (`?session_id=`): the new
 * plan can take a while to reach every server, so callers keep polling and hold back the
 * "no plan" notice meanwhile. The parameter leaves the URL straight away, so a saved or
 * reloaded link can't hide the notice again.
 */
export function useCheckoutReturn(): boolean {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(() => searchParams.has("session_id"));

  useEffect(() => {
    if (!pending) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("session_id")) {
      url.searchParams.delete("session_id");
      window.history.replaceState(null, "", url);
    }
    const timer = setTimeout(() => setPending(false), CHECKOUT_RETURN_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  return pending;
}

/** The organization owner's name and email, for members who can't start a plan themselves. */
export function OrganizationOwnerContact({ organizationId }: { organizationId: string }) {
  const t = useExtracted();
  const { data: members } = useOrganizationMembers(organizationId);
  const owner = members?.data.find(member => member.role === "owner");

  if (!owner) return null;

  const displayName = owner.user.name || owner.user.email;

  const copyEmail = async () => {
    await navigator.clipboard.writeText(owner.user.email);
    toast.success(t("Copied to clipboard"));
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-150 px-3 py-2.5 text-left dark:border-neutral-800">
      <div
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        {displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">{displayName}</span>
        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {t("{email} · Owner", { email: owner.user.email })}
        </span>
      </div>
      <Button size="sm" onClick={copyEmail} className="ml-auto">
        {t("Copy email")}
      </Button>
    </div>
  );
}

/**
 * Shown in place of the install instructions on a site that collects nothing until its
 * organization starts a plan, and above the site list when any site is in that state.
 * `siteName` names the site on its own dashboard; without it the copy covers every site.
 */
export function PlanRequiredNotice({
  organizationId,
  siteName,
  returnPath,
  className,
}: {
  organizationId: string;
  siteName?: string;
  returnPath: string;
  className?: string;
}) {
  const t = useExtracted();
  const { isLoading, isOwner, trialEligible } = usePlanPrompt(organizationId);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planFlowStarted, setPlanFlowStarted] = useState(false);

  // Wait for the role and the organization's history rather than promising a trial it can't have.
  if (isLoading) return null;

  const title = siteName
    ? t("{site} isn't collecting data", { site: siteName })
    : t("Your websites aren't collecting data");

  let description = t("Only the organization owner can start a plan. Tracking turns on as soon as they do.");
  if (isOwner) {
    description = trialEligible
      ? t("Start your 7-day free trial to turn tracking on. You won't be charged until the trial ends.")
      : t("Choose a plan to turn tracking back on.");
  }

  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-850 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold leading-tight tracking-tight">{title}</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      {isOwner ? (
        <>
          <Button
            variant="success"
            className="shrink-0"
            onClick={() => {
              setPlanFlowStarted(true);
              setPlanDialogOpen(true);
            }}
          >
            {trialEligible ? t("Start free trial") : t("Choose a plan")}
            <ArrowRight />
          </Button>
          {planFlowStarted && (
            <LazyStartPlanDialog
              open={planDialogOpen}
              onOpenChange={setPlanDialogOpen}
              organizationId={organizationId}
              returnPath={returnPath}
              trialEligible={trialEligible}
            />
          )}
        </>
      ) : (
        <div className="shrink-0 sm:w-96">
          <OrganizationOwnerContact organizationId={organizationId} />
        </div>
      )}
    </section>
  );
}
