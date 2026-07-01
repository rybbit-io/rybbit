"use client";

import { useAppEnv } from "@/hooks/useIsProduction";
import { useStopImpersonation } from "@/hooks/useStopImpersonation";
import { IS_CLOUD } from "@/lib/const";
import QueryProvider from "@/providers/QueryProvider";
import { ThemeProvider } from "next-themes";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AuthenticationGuard } from "../components/AuthenticationGuard";
import { OrganizationInitializer } from "../components/OrganizationInitializer";
import { Toaster } from "../components/ui/sonner";
import { VersionCheck } from "../components/VersionCheck";
import { TooltipProvider } from "../components/ui/tooltip";

type EmbedTheme = "light" | "dark" | "system";

function getEmbedTheme(): EmbedTheme | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  if (params.get("embed") !== "true") return null;

  const theme = params.get("theme");
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme;
  }

  return "system";
}

export function Providers({ children }: { children: React.ReactNode }) {
  useStopImpersonation();
  const appEnv = useAppEnv();
  const embedTheme = getEmbedTheme();
  const themeStorageKey = embedTheme ? `embed-theme-${embedTheme}` : "theme";

  return (
    <NuqsAdapter>
      <ThemeProvider
        key={themeStorageKey}
        attribute="class"
        enableSystem={true}
        defaultTheme={embedTheme ?? "system"}
        storageKey={themeStorageKey}
        disableTransitionOnChange
      >
        <TooltipProvider>
          <QueryProvider>
            <OrganizationInitializer />
            <AuthenticationGuard />
            {children}
            <VersionCheck />
          </QueryProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
      {appEnv === "prod" && (
        <Script src="https://demo.rybbit.com/api/script.js" data-site-id="21" strategy="afterInteractive" />
      )}
      {appEnv === "demo" && (
        <Script src="https://demo.rybbit.com/api/script.js" data-site-id="22" strategy="afterInteractive" />
      )}
      {appEnv === "prod" && IS_CLOUD && (
        <>
          <Script id="rewardful-queue" strategy="beforeInteractive">
            {`(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)})(window,'rewardful');`}
          </Script>
          <Script src="https://r.wdfl.co/rw.js" data-rewardful="fc3780" strategy="afterInteractive" />
        </>
      )}
    </NuqsAdapter>
  );
}
