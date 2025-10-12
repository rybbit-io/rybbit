"use client";

import { useEffect } from "react";
import { redirect, usePathname } from "next/navigation";
import { userStore } from "../lib/userStore";
import { useGetSiteIsPublic } from "../api/admin/sites";

const publicRoutes = ["/login", "/signup", "/invitation", "/reset-password"];

export function AuthenticationGuard() {
  const { user, isPending } = userStore();
  const pathname = usePathname();

  // Extract potential siteId from path like /{siteId} or /{siteId}/something
  const pathSegments = pathname.split("/").filter(Boolean);
  const potentialSiteId = pathSegments.length > 0 && !isNaN(Number(pathSegments[0])) ? pathSegments[0] : undefined;

  // Use Tanstack Query to check if site is public
  const { data: isPublicSite, isLoading: isCheckingPublic } = useGetSiteIsPublic(potentialSiteId);

  useEffect(() => {
    // Only redirect if:
    // 1. We're not checking public status anymore
    // 2. User is not logged in
    // 3. Not on a public route
    // 4. Not on a public site
    if (!isPending && !isCheckingPublic && !user && !publicRoutes.includes(pathname) && !isPublicSite) {
      redirect("/login");
    }
  }, [isPending, user, pathname, isCheckingPublic, isPublicSite]);

  return null; // This component doesn't render anything
}
