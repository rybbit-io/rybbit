"use client";

import { usePathname } from "next/navigation";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { FreePlanBanner } from "../../../../components/FreePlanBanner";
import { useStore } from "../../../../lib/store";
import { userStore } from "../../../../lib/userStore";
import { AffiliateBanner } from "./AffiliateBanner";
import { ClaimSiteBanner } from "./ClaimSiteBanner";
import { DemoSignupBanner } from "./DemoSignupBanner";
import { NoData } from "./NoData";
import { UsageBanners } from "./UsageBanners";

export function Header() {
  const { user } = userStore();
  const { site } = useStore();
  const { data: siteMetadata } = useGetSite(site);
  const pathname = usePathname();

  // An unclaimed site's visitor has no session, but still needs the claim
  // banner and the install instructions.
  const isUnclaimed = !!siteMetadata && siteMetadata.organizationId === null && !!siteMetadata.claimExpiresAt;

  const isGlobe = pathname.includes("/globe");

  if (!user && !isUnclaimed) {
    return <div className="flex flex-col" />;
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col px-2 md:px-4">
        <ClaimSiteBanner />
        {user && !isGlobe && !isUnclaimed && (
          <>
            <DemoSignupBanner />
            <AffiliateBanner />
            <FreePlanBanner />
            <UsageBanners />
          </>
        )}
        {!isGlobe && <NoData />}
      </div>
    </div>
  );
}
