"use client";

import { usePathname } from "next/navigation";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { FreePlanBanner } from "../../../../components/FreePlanBanner";
import { useStore } from "../../../../lib/store";
import { userStore } from "../../../../lib/userStore";
import { PlanRequiredNotice, useCheckoutReturn } from "../../../components/PlanRequired";
import { AffiliateBanner } from "./AffiliateBanner";
import { ClaimSiteBanner } from "./ClaimSiteBanner";
import { DemoSignupBanner } from "./DemoSignupBanner";
import { NoData } from "./NoData";
import { UsageBanners } from "./UsageBanners";

export function Header() {
  const { user } = userStore();
  const { site } = useStore();
  const pathname = usePathname();
  // Back from checkout: keep asking until the site stops needing a plan.
  const checkoutReturnPending = useCheckoutReturn();
  const { data: siteMetadata } = useGetSite(site, {
    refetchInterval: checkoutReturnPending ? query => (query.state.data?.requiresPlan ? 3000 : false) : undefined,
  });
  // The site collects nothing until its organization starts a plan: ask for one instead of
  // showing usage banners and install instructions that can't work yet. Straight after
  // checkout, show the install card while the plan catches up.
  const requiresPlan = !!siteMetadata?.requiresPlan && !!siteMetadata.organizationId && !checkoutReturnPending;

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
        {user && !isGlobe && !isUnclaimed && requiresPlan && siteMetadata?.organizationId && (
          <PlanRequiredNotice
            organizationId={siteMetadata.organizationId}
            siteName={siteMetadata.name}
            returnPath={`/${siteMetadata.siteId}`}
            className="mt-4"
          />
        )}
        {user && !isGlobe && !isUnclaimed && !requiresPlan && (
          <>
            <DemoSignupBanner />
            {/* <AffiliateBanner /> */}
            <FreePlanBanner />
            <UsageBanners />
          </>
        )}
        {!isGlobe && !requiresPlan && <NoData />}
      </div>
    </div>
  );
}
