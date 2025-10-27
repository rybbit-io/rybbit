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

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use the hook to expose stopImpersonating globally
  useStopImpersonation();

  const { isProduction, isAppProduction } = useIsProduction();

  return (
    <html lang="en" className="dark">
      <ReactScan />
      <TooltipProvider>
        <body className={cn("bg-background text-foreground h-full", inter.className)} suppressHydrationWarning>
          <QueryProvider>
            <OrganizationInitializer />
            <AuthenticationGuard />
            {children}
          </QueryProvider>
          <Toaster />
        </body>
      </TooltipProvider>
      {isAppProduction && (
        <>
          <Script
            src="https://demo.rybbit.io/api/script.js"
            data-site-id="21"
            strategy="afterInteractive"
            data-web-vitals="true"
            data-track-errors="true"
            data-session-replay="true"
          />
        </>
      )}
    </html>
  );
}
