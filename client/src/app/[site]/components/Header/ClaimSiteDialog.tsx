"use client";

import { AuthError } from "@/components/auth/AuthError";
import { CheckoutModal } from "@/components/subscription/components/CheckoutModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { SiteResponse } from "../../../../api/admin/endpoints/sites";
import { claimSite } from "../../../../api/admin/endpoints";
import { USER_ORGANIZATIONS_QUERY_KEY, useUserOrganizations } from "../../../../api/admin/hooks/useOrganizations";
import { authClient } from "../../../../lib/auth";
import { useConfigs } from "../../../../lib/configs";
import { BACKEND_URL, IS_CLOUD } from "../../../../lib/const";
import { trackAdEvent } from "../../../../lib/trackAdEvent";
import { userStore } from "../../../../lib/userStore";
import { cn } from "../../../../lib/utils";
import { AccountStep } from "../../../signup/components/AccountStep";
import { PlanStep } from "../../../signup/components/PlanStep";
import { EVENT_TIERS, findPriceForTier } from "../../../subscribe/components/utils";

interface ClaimSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: number;
  domain: string;
  privateLinkKey: string;
  organizationId?: string;
}

function slugFromDomain(domain: string) {
  const base = domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "site"}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * The signup flow, minus the "Add site" step: the site already exists. A new
 * visitor creates an account, we create an organization named after the
 * domain and claim the site into it, then (cloud) they pick a plan. A visitor
 * who is already signed in only picks which organization keeps the site.
 */
export function ClaimSiteDialog({
  open,
  onOpenChange,
  siteId,
  domain,
  privateLinkKey,
  organizationId: resumeOrganizationId,
}: ClaimSiteDialogProps) {
  const t = useExtracted();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = userStore();
  const { configs, isLoading: isLoadingConfigs } = useConfigs();
  const {
    data: organizations,
    isPending: isLoadingOrganizations,
    error: organizationsError,
  } = useUserOrganizations({ enabled: !!user });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Account step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  // Plan step (cloud)
  const [eventLimitIndex, setEventLimitIndex] = useState(0);
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro">("pro");
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);

  const [claimedOrganizationId, setClaimedOrganizationId] = useState<string | null>(resumeOrganizationId ?? null);
  const planOrganizationId = claimedOrganizationId ?? resumeOrganizationId;
  const returnPath = `/${siteId}/${privateLinkKey}?claim=1`;
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");

  const adminOrganizations = (organizations ?? []).filter(org => org.role === "owner" || org.role === "admin");
  const hasExistingOrganization = !!user && adminOrganizations.length > 0;

  // Step 1 = account (skipped when signed in), step 2 = claim (existing org only), step 3 = plan (cloud only)
  const steps = IS_CLOUD ? [{ label: t("Account") }, { label: t("Pick plan") }] : [{ label: t("Account") }];
  const currentStepIndex = planOrganizationId ? 1 : 0;

  const claimInto = async (organizationId: string, pickPlan = false) => {
    const active = await authClient.organization.setActive({ organizationId });
    if (active.error) throw new Error(active.error.message);
    await claimSite(siteId, privateLinkKey, organizationId);
    setClaimedOrganizationId(organizationId);

    // Move off the revoked link immediately. The dialog stays mounted in the
    // site layout, and ?claim=plan can resume the plan step after a reload.
    router.replace(`/${siteId}/main${pickPlan && IS_CLOUD ? "?claim=plan" : ""}`);
    await queryClient.cancelQueries({ queryKey: ["get-site"] });
    for (const id of [siteId, String(siteId)]) {
      queryClient.setQueryData(["get-site", id], (site: SiteResponse | null | undefined) =>
        site
          ? {
              ...site,
              organizationId,
              claimExpiresAt: null,
              isOwner: true,
            }
          : site
      );
    }
    void queryClient.invalidateQueries({ queryKey: ["get-site"] });
    void queryClient.invalidateQueries({ queryKey: ["get-sites-from-org", organizationId] });
    void queryClient.invalidateQueries({ queryKey: ["site-is-public"] });
    void queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
  };

  const createOrganizationAndClaim = async () => {
    const { data, error: orgError } = await authClient.organization.create({
      name: domain,
      slug: slugFromDomain(domain),
    });
    if (orgError) {
      throw new Error(orgError.message || t("Failed to create organization"));
    }
    if (!data?.id) {
      throw new Error(t("No organization ID returned"));
    }
    await claimInto(data.id, true);
    return data.id;
  };

  const finish = () => {
    onOpenChange(false);
    router.replace(`/${siteId}`);
  };

  const handleAccountSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (IS_CLOUD && !turnstileToken) {
        setError(t("Please complete the captcha verification"));
        return;
      }

      const { data, error: signupError } = await authClient.signUp.email(
        { email, name: email.split("@")[0], password },
        {
          onRequest: context => {
            if (IS_CLOUD && turnstileToken) {
              context.headers.set("x-captcha-response", turnstileToken);
            }
          },
        }
      );

      if (signupError) {
        setError(signupError.message ?? "");
        return;
      }

      if (data?.user) {
        userStore.setState({ user: data.user });
        trackAdEvent("signup");
        await createOrganizationAndClaim();
        if (!IS_CLOUD) finish();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingUserClaim = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (hasExistingOrganization) {
        const organizationId = selectedOrganizationId || adminOrganizations[0].id;
        await claimInto(organizationId);
        finish();
      } else {
        await createOrganizationAndClaim();
        if (!IS_CLOUD) finish();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError("");

    try {
      const eventLimit = EVENT_TIERS[eventLimitIndex];
      if (eventLimit === "Custom") return;

      const selectedTierPrice = findPriceForTier(eventLimit, isAnnual ? "year" : "month", selectedPlan);
      if (!selectedTierPrice) {
        setError(t("Could not find a matching plan. Please try a different selection."));
        return;
      }

      const returnUrl = `${window.location.origin}/${siteId}?session_id={CHECKOUT_SESSION_ID}`;
      const checkoutResponse = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId: selectedTierPrice.priceId,
          returnUrl,
          organizationId: planOrganizationId,
          referral: (window as any).Rewardful?.referral || undefined,
        }),
      });

      const checkoutData = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        throw new Error(checkoutData.error || t("Failed to create checkout session"));
      }

      trackAdEvent("checkout", { tier: selectedTierPrice.name });
      setCheckoutClientSecret(checkoutData.clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (planOrganizationId && IS_CLOUD) {
      return (
        <PlanStep
          eventLimitIndex={eventLimitIndex}
          setEventLimitIndex={setEventLimitIndex}
          isAnnual={isAnnual}
          setIsAnnual={setIsAnnual}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          onSubscribe={handleSubscribe}
          isLoading={isLoading}
        />
      );
    }

    if (user) {
      if (isLoadingOrganizations) return <p>{t("Loading...")}</p>;
      if (organizationsError) return <AuthError error={organizationsError.message} />;
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">{t("Keep {domain}", { domain })}</h2>
          {hasExistingOrganization ? (
            <div className="space-y-2">
              <Label htmlFor="claim-organization">{t("Organization")}</Label>
              <Select
                value={selectedOrganizationId || adminOrganizations[0].id}
                onValueChange={setSelectedOrganizationId}
              >
                <SelectTrigger id="claim-organization" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminOrganizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("The site moves into this organization.")}</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t("We'll create an organization named {domain} and move the site into it.", { domain })}
            </p>
          )}
          <Button
            variant="success"
            className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={handleExistingUserClaim}
            disabled={isLoading}
          >
            {t("Claim site")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (isLoadingConfigs) return <p>{t("Loading...")}</p>;
    if (configs?.disableSignup)
      return (
        <div className="space-y-4">
          <p>{t("Signup is disabled")}</p>
          <Link href={`/login?returnTo=${encodeURIComponent(returnPath)}`}>{t("Log in")}</Link>
        </div>
      );

    return (
      <AccountStep
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        turnstileToken={turnstileToken}
        setTurnstileToken={setTurnstileToken}
        isLoading={isLoading}
        onSubmit={handleAccountSubmit}
        setError={setError}
        socialCallbackURL={returnPath}
        loginHref={`/login?returnTo=${encodeURIComponent(returnPath)}`}
      />
    );
  };

  return (
    <>
      <Dialog
        open={open && !checkoutClientSecret}
        onOpenChange={next => {
          if (isLoading) return;
          if (!next && planOrganizationId) finish();
          else onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px]">
          <div className="mb-2">
            <DialogTitle className="text-3xl font-medium">
              {IS_CLOUD ? t("Start your 7-day free trial") : t("Get started with Rybbit")}
            </DialogTitle>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              {t("Claim {domain} to keep its dashboard and everything it has collected.", { domain })}
            </p>
          </div>

          {steps.length > 1 && (
            <div className="mb-4 flex w-full items-center">
              {steps.map(({ label }, index, arr) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-300",
                        currentStepIndex === index
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                          : currentStepIndex > index
                            ? "bg-emerald-600 text-white"
                            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                      )}
                    >
                      {currentStepIndex > index ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors duration-300",
                        currentStepIndex >= index
                          ? "text-neutral-900 dark:text-neutral-100"
                          : "text-neutral-400 dark:text-neutral-500"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div
                      className={cn(
                        "mx-3 mb-6 h-0.5 flex-1 rounded-full transition-all duration-300",
                        currentStepIndex > index ? "bg-emerald-600" : "bg-neutral-200 dark:bg-neutral-800"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {renderContent()}
            <AuthError error={error} />
          </div>
        </DialogContent>
      </Dialog>

      {IS_CLOUD && (
        <CheckoutModal
          clientSecret={checkoutClientSecret}
          open={!!checkoutClientSecret}
          onOpenChange={next => {
            if (!next) {
              setCheckoutClientSecret(null);
              finish();
            }
          }}
        />
      )}
    </>
  );
}
