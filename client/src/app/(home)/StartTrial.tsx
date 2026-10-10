"use client";

import { Globe } from "lucide-react";
import { useExtracted } from "next-intl";
import { useId, useState } from "react";
import { addSite } from "../../api/admin/endpoints";
import { RybbitLogo } from "../../components/RybbitLogo";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { isValidDomain, normalizeDomain } from "../../lib/utils";
import { LazyStartPlanDialog, OrganizationOwnerContact, usePlanPrompt } from "../components/PlanRequired";

/**
 * The home page of a cloud organization with no websites and no plan. The owner names the
 * site first, then picks a plan; checkout returns them to the new site's install
 * instructions. The site exists from the first step (as it does in signup) but collects
 * nothing until the plan starts. Other members are pointed at the owner, who alone can
 * start checkout.
 */
export function StartTrial({ organizationId, onSiteCreated }: { organizationId: string; onSiteCreated: () => void }) {
  const t = useExtracted();
  const { isLoading, isOwner, trialEligible } = usePlanPrompt(organizationId);
  const inputId = useId();
  const messageId = useId();

  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  if (isLoading) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedDomain = normalizeDomain(domain);
    if (!isValidDomain(normalizedDomain)) {
      setError(t("Enter a domain like example.com"));
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const site = await addSite(normalizedDomain, normalizedDomain, organizationId);
      setSiteId(site.siteId);
      setPlanDialogOpen(true);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : String(addError));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 pt-16 pb-24 text-center sm:pt-24">
      <div className="mb-7">
        <RybbitLogo width={56} height={37} />
      </div>

      {isOwner ? (
        <div className="flex w-full max-w-[560px] flex-col items-center">
          <h1 className="mb-2.5 text-3xl font-semibold leading-tight tracking-tight">
            {t("What site do you want to track?")}
          </h1>
          <p className="mb-7 text-sm text-pretty text-neutral-500 dark:text-neutral-400">
            {trialEligible
              ? t(
                  "Enter your domain to start a 7-day free trial. Your site will be ready to install as soon as checkout is done."
                )
              : t(
                  "Enter your domain and choose a plan. Your site will be ready to install as soon as checkout is done."
                )}
          </p>

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
            <label htmlFor={inputId} className="sr-only">
              {t("Your domain")}
            </label>
            <div className="relative flex-1">
              <Globe
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
              />
              <Input
                id={inputId}
                value={domain}
                onChange={event => setDomain(event.target.value)}
                placeholder="yourdomain.com"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={messageId}
                disabled={siteId !== null}
                className="h-10 pl-9 text-base sm:text-sm"
              />
            </div>
            {siteId === null ? (
              <Button type="submit" variant="success" className="h-10 px-4" loading={isCreating}>
                {trialEligible ? t("Start free trial") : t("Choose a plan")}
              </Button>
            ) : (
              <Button type="button" variant="success" className="h-10 px-4" onClick={() => setPlanDialogOpen(true)}>
                {trialEligible ? t("Start free trial") : t("Choose a plan")}
              </Button>
            )}
          </form>

          {error ? (
            <p id={messageId} role="alert" className="mt-3.5 text-sm text-red-500 dark:text-red-400">
              {error}
            </p>
          ) : (
            <p id={messageId} className="mt-3.5 text-xs text-neutral-500 dark:text-neutral-400">
              {trialEligible ? t("No charge until the trial ends. Cancel anytime.") : t("Cancel anytime.")}
            </p>
          )}

          {siteId !== null && (
            <LazyStartPlanDialog
              open={planDialogOpen}
              onOpenChange={setPlanDialogOpen}
              organizationId={organizationId}
              returnPath={`/${siteId}`}
              trialEligible={trialEligible}
              onDone={onSiteCreated}
            />
          )}
        </div>
      ) : (
        <div className="flex w-full max-w-[440px] flex-col items-center gap-5">
          <div className="flex flex-col gap-2.5">
            <h1 className="text-xl font-semibold leading-tight tracking-tight">
              {t("This organization doesn't have a plan yet")}
            </h1>
            <p className="text-sm text-pretty text-neutral-500 dark:text-neutral-400">
              {t("Only the owner can start one. Once they do, you can add websites here.")}
            </p>
          </div>
          <div className="w-full">
            <OrganizationOwnerContact organizationId={organizationId} />
          </div>
        </div>
      )}
    </div>
  );
}
