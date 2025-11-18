"use client";

import QueryProvider from "@/providers/QueryProvider";
import { Inter } from "next/font/google";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { cn } from "../lib/utils";
import "./globals.css";
import Script from "next/script";
import { useStopImpersonation } from "@/hooks/useStopImpersonation";
import { useIsProduction } from "@/hooks/useIsProduction";
import { ReactScan } from "./ReactScan";
import { OrganizationInitializer } from "../components/OrganizationInitializer";
import { AuthenticationGuard } from "../components/AuthenticationGuard";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use the hook to expose stopImpersonating globally
  useStopImpersonation();

  const { isProduction, isAppProduction } = useIsProduction();

  return (
    <html lang="en" suppressHydrationWarning>
      <ReactScan />
      <NuqsAdapter>
        <body className={cn("bg-background text-foreground h-full", inter.className)} suppressHydrationWarning>
          <ThemeProvider attribute="class" enableSystem={true} disableTransitionOnChange>
            <TooltipProvider>
              <QueryProvider>
                <OrganizationInitializer />
                <AuthenticationGuard />
                {children}
              </QueryProvider>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
          {isAppProduction && (
            <>
              <Script
                src="https://demo.rybbit.com/api/script.js"
                data-site-id="21"
                strategy="afterInteractive"
                data-web-vitals="true"
                data-track-errors="true"
                data-session-replay="true"
              />
            </>
          )}
        </body>
      </NuqsAdapter>
    </html>
  );
}
