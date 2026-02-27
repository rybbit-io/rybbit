"use client";

import { AuthError } from "@/components/auth/AuthError";
import { CheckoutModal } from "@/components/subscription/CheckoutModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import React, { Suspense, useState } from "react";
import { addSite } from "../../api/admin/endpoints";
import { RybbitLogo, RybbitTextLogo } from "../../components/RybbitLogo";

import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { authClient } from "../../lib/auth";
import { useConfigs } from "../../lib/configs";
import { BACKEND_URL, IS_CLOUD } from "../../lib/const";
import { trackAdEvent } from "../../lib/trackAdEvent";
import { userStore } from "../../lib/userStore";
import { cn, isValidDomain, normalizeDomain } from "../../lib/utils";
import { EVENT_TIERS, findPriceForTier } from "../subscribe/components/utils";
import { AccountStep } from "./components/AccountStep";
import { PlanStep } from "./components/PlanStep";
import { SetupStep } from "./components/SetupStep";

function SignupPageContent() {
  const { configs, isLoading: isLoadingConfigs } = useConfigs();
  useSetPageTitle("Signup");
  const t = useExtracted();

  const maxStep = IS_CLOUD ? 3 : 2;
  const [stepParam, setStepParam] = useQueryState("step", parseAsInteger);
  const [currentStep, setCurrentStepRaw] = useState(stepParam && stepParam >= 1 && stepParam <= maxStep ? stepParam : 1);

  // Wrap setCurrentStep to also update the URL param
  const setCurrentStep = (step: number) => {
    setCurrentStepRaw(step);
    setStepParam(step);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  // Step 1: Account creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  // Plan selection (cloud step 2)
  const [eventLimitIndex, setEventLimitIndex] = useState(0);
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "standard" | "pro">("pro");
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);

  // Setup: Organization + website
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [domain, setDomain] = useState("");

  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    if (value) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setOrgSlug(generatedSlug);
    }
  };

  // Step 1: Account creation submission
  const handleAccountSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (IS_CLOUD && !turnstileToken) {
        setError(t("Please complete the captcha verification"));
        setIsLoading(false);
        return;
      }

      const { data, error } = await authClient.signUp.email(
        {
          email,
          name: email.split("@")[0],
          password,
        },
        {
          onRequest: context => {
            if (IS_CLOUD && turnstileToken) {
              context.headers.set("x-captcha-response", turnstileToken);
            }
          },
        }
      );

      if (data?.user) {
        userStore.setState({ user: data.user });
        setCurrentStep(2);
      }

      if (error) {
        setError(error.message ?? "");
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Setup submission — create org + site, then advance (cloud) or redirect (self-hosted)
  const [siteId, setSiteId] = useState<number | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const handleSetupSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!isValidDomain(domain)) {
        setError(t("Invalid domain format. Must be a valid domain like example.com or sub.example.com"));
        setIsLoading(false);
        return;
      }

      // Create organization
      const { data, error } = await authClient.organization.create({
        name: orgName,
        slug: orgSlug,
      });

      if (error) {
        throw new Error(error.message || t("Failed to create organization"));
      }

      if (!data?.id) {
        throw new Error(t("No organization ID returned"));
      }

      await authClient.organization.setActive({ organizationId: data.id });

      if (IS_CLOUD && referralSource && userStore.getState().user?.id) {
        window.rybbit?.identify(userStore.getState().user?.id || "", {
          source: referralSource,
        });
      }

      // Add website
      const normalizedDomain = normalizeDomain(domain);
      const response = await addSite(normalizedDomain, normalizedDomain, data.id);

      if (IS_CLOUD) {
        setSiteId(response.siteId);
        setOrganizationId(data.id);
        setCurrentStep(3);
      } else {
        router.push(`/${response.siteId}`);
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3 (cloud): Create checkout session and open modal
  const handleSubscribe = async () => {
    setIsLoading(true);
    setError("");

    try {
      const eventLimit = EVENT_TIERS[eventLimitIndex];
      if (eventLimit === "Custom") return;

      const selectedTierPrice = findPriceForTier(
        eventLimit,
        isAnnual ? "year" : "month",
        selectedPlan
      );

      if (!selectedTierPrice) {
        setError("Could not find a matching plan. Please try a different selection.");
        return;
      }

      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/${siteId}?session_id={CHECKOUT_SESSION_ID}`;

      const checkoutResponse = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId: selectedTierPrice.priceId,
          returnUrl,
          organizationId,
          referral: (window as any).Rewardful?.referral || undefined,
        }),
      });

      const checkoutData = await checkoutResponse.json();

      if (!checkoutResponse.ok) {
        throw new Error(checkoutData.error || "Failed to create checkout session");
      }

      trackAdEvent("checkout", { tier: selectedTierPrice.name });
      setCheckoutClientSecret(checkoutData.clientSecret);
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const steps = IS_CLOUD
    ? [
      { step: 1, label: t("Account") },
      { step: 2, label: t("Add site") },
      { step: 3, label: t("Pick plan") },
    ]
    : [
      { step: 1, label: t("Account") },
      { step: 2, label: t("Add site") },
    ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
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
          />
        );
      case 2:
        return (
          <SetupStep
            domain={domain}
            setDomain={setDomain}
            orgName={orgName}
            orgSlug={orgSlug}
            handleOrgNameChange={handleOrgNameChange}
            referralSource={referralSource}
            setReferralSource={setReferralSource}
            isLoading={isLoading}
            onSubmit={handleSetupSubmit}
          />
        );
      case 3:
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
      default:
        return null;
    }
  };

  if (isLoadingConfigs) {
    return null;
  }

  if (configs?.disableSignup) {
    return (
      <div className="flex justify-center items-center h-dvh w-full">
        <Card className="w-full max-w-sm p-1">
          <CardHeader>
            <RybbitLogo width={32} height={32} />
            <CardTitle className="text-2xl flex justify-center">{t("Sign Up Disabled")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <p className="text-center">
                {t("New account registration is currently disabled. If you have an account, you can")}{" "}
                <Link href="/login" className="underline">
                  {t("sign in")}
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full justify-center">
      <div className="w-full max-w-[550px] flex flex-col p-6 lg:p-10">
        {/* Logo */}
        <div className="mb-8">
          <a href="https://rybbit.com" target="_blank" className="inline-block">
            <RybbitTextLogo />
          </a>
        </div>

        <div className="flex-1 flex flex-col justify-center w-full max-w-[550px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-medium">
              {IS_CLOUD ? t("Start your 7-day free trial") : t("Get started with Rybbit")}
            </h1>
            {IS_CLOUD && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                {t("Start collecting analytics in minutes")}
              </p>
            )}
          </div>

          {/* Horizontal step indicator */}
          <div className="flex items-center w-full mb-8">
            {steps.map(({ step, label }, index, arr) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all duration-300",
                      currentStep === step
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                        : currentStep > step
                          ? "bg-emerald-600 text-white"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                    )}
                  >
                    {currentStep > step ? <Check className="h-4 w-4" /> : step}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors duration-300",
                      currentStep >= step
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
                      "flex-1 h-0.5 mx-3 mb-6 transition-all duration-300 rounded-full",
                      currentStep > step ? "bg-emerald-600" : "bg-neutral-200 dark:bg-neutral-800"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Content area */}
          <div className="flex flex-col gap-4">
            {renderStepContent()}
            <AuthError error={error} />
          </div>
        </div>

        {!IS_CLOUD && (
          <div className="text-xs text-muted-foreground mt-8">
            <a
              href="https://rybbit.com"
              target="_blank"
              rel="noopener"
              title="Rybbit - Open Source Privacy-Focused Web Analytics"
            >
              {t("Open source web analytics powered by Rybbit")}
            </a>
          </div>
        )}
      </div>

      {IS_CLOUD && (
        <CheckoutModal
          clientSecret={checkoutClientSecret}
          open={!!checkoutClientSecret}
          onOpenChange={(open) => {
            if (!open) setCheckoutClientSecret(null);
          }}
        />
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
