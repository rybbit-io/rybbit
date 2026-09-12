"use client";

import { AuthError } from "@/components/auth/AuthError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createUnclaimedSite } from "../../api/admin/endpoints";
import { RybbitTextLogo } from "../../components/RybbitLogo";
import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { useConfigs } from "../../lib/configs";
import { IS_CLOUD } from "../../lib/const";
import { isValidDomain, normalizeDomain } from "../../lib/utils";

/**
 * Landing-page entry point: /try?domain=example.com creates an owner-less site
 * and drops the visitor straight into its private-link dashboard. They claim it
 * from the banner there. Without a usable domain, or on failure, this page
 * shows the same input so the visitor can retry.
 */
function TryPageContent() {
  const t = useExtracted();
  const { configs, isLoading: isLoadingConfigs, error: configError } = useConfigs();
  useSetPageTitle("Start tracking");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDomain = normalizeDomain(searchParams.get("domain") ?? "");

  const [domain, setDomain] = useState(initialDomain);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const autoSubmitted = useRef(false);

  const submit = async (value: string) => {
    const normalized = normalizeDomain(value);
    if (!isValidDomain(normalized)) {
      setError(t("Invalid domain format. Must be a valid domain like example.com or sub.example.com"));
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const site = await createUnclaimedSite(normalized);
      router.replace(`/${site.siteId}/${site.privateLinkKey}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIsLoading(false);
    }
  };

  // Arriving from the landing page with a valid domain: go straight through.
  useEffect(() => {
    if (!configs || configs.disableSignup) return;
    if (autoSubmitted.current || !initialDomain || !isValidDomain(initialDomain)) return;
    autoSubmitted.current = true;
    void submit(initialDomain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDomain, configs]);

  if (configs?.disableSignup || configError) {
    return (
      <div className="mx-auto max-w-md p-8">
        <AuthError error={configError?.message ?? t("Signup is disabled")} />
      </div>
    );
  }

  if ((isLoading || isLoadingConfigs) && !error) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("Setting up your dashboard for {domain}…", { domain })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full justify-center">
      <div className="flex w-full max-w-[550px] flex-col p-6 lg:p-10">
        <div className="mb-8">
          <a href="https://rybbit.com" target="_blank" className="inline-block">
            <RybbitTextLogo />
          </a>
        </div>

        <form
          className="flex flex-1 flex-col justify-center gap-6"
          onSubmit={e => {
            e.preventDefault();
            void submit(domain);
          }}
        >
          <div>
            <h1 className="text-3xl font-medium">{t("See who's on your site")}</h1>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              {t("Enter your domain to open a live dashboard. No account needed until you want to keep it.")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">{t("Website Domain")}</Label>
            <Input
              id="domain"
              type="text"
              autoFocus
              placeholder="example.com or sub.example.com"
              value={domain}
              onChange={e => setDomain(e.target.value.toLowerCase())}
              required
              className="h-11 bg-neutral-100 transition-all dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
            />
          </div>

          <Button
            type="submit"
            variant="success"
            className="h-11 w-full bg-emerald-600 text-white transition-all duration-300 hover:bg-emerald-500"
            disabled={isLoading || !domain || !isValidDomain(normalizeDomain(domain))}
          >
            {t("See my dashboard")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <AuthError error={error} />

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {IS_CLOUD
              ? t("Your dashboard stays open for 24 hours. Claim it with a free 7-day trial to keep it.")
              : t("Your dashboard stays open for 24 hours. Create an account to keep it.")}
          </p>
        </form>
      </div>
    </div>
  );
}

export default function TryPage() {
  return (
    <Suspense fallback={null}>
      <TryPageContent />
    </Suspense>
  );
}
