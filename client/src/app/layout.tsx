"use client";

import { BACKEND_URL } from "@/lib/const";
import QueryProvider from "@/providers/QueryProvider";
import { Inter } from "next/font/google";
import { redirect, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { userStore } from "../lib/userStore";
import { cn } from "../lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// const manrope = Manrope({
//   subsets: ["latin"],
// });

const publicRoutes = ["/login", "/signup"];

// Helper function to check if a site is public
async function checkIfSiteIsPublic(siteId: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/site-is-public/${siteId}`);
    if (response.ok) {
      const data = await response.json();
      return !!data.isPublic;
    }
  } catch (error) {
    console.error("Error checking if site is public:", error);
  }
  return false;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isPending } = userStore();
  const pathname = usePathname();
  const [isCheckingPublic, setIsCheckingPublic] = useState(false);
  const [isPublicSite, setIsPublicSite] = useState(false);

  useEffect(() => {
    // Check if the current path could be a site path
    // Extract potential siteId from path like /{siteId} or /{siteId}/something
    const pathSegments = pathname.split("/").filter(Boolean);
    if (pathSegments.length > 0) {
      const potentialSiteId = pathSegments[0];

      // Don't check for public site status on obvious non-site paths
      if (
        !publicRoutes.includes(`/${potentialSiteId}`) &&
        !["_next", "api", "settings", "subscribe"].includes(potentialSiteId)
      ) {
        setIsCheckingPublic(true);

        checkIfSiteIsPublic(potentialSiteId).then((isPublic) => {
          setIsPublicSite(isPublic);
          setIsCheckingPublic(false);
        });
      }
    }
  }, [pathname]);

  useEffect(() => {
    // Only redirect if:
    // 1. We're not checking public status anymore
    // 2. User is not logged in
    // 3. Not on a public route
    // 4. Not on a public site
    if (
      !isPending &&
      !isCheckingPublic &&
      !user &&
      !publicRoutes.includes(pathname) &&
      !isPublicSite
    ) {
      redirect("/login");
    }
  }, [isPending, user, pathname, isCheckingPublic, isPublicSite]);

  return (
    <html lang="en" className="dark">
      <TooltipProvider>
        <body
          className={cn("bg-background text-foreground h-full", inter.className)}
        >
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </body>
      </TooltipProvider>
    </html>
  );
}
