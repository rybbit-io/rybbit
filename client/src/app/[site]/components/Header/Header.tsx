"use client";

import { usePathname } from "next/navigation";
import { FreePlanBanner } from "../../../../components/FreePlanBanner";
import { userStore } from "../../../../lib/userStore";
import { AffiliateBanner } from "./AffiliateBanner";
import { DemoSignupBanner } from "./DemoSignupBanner";
import { NoData } from "./NoData";
import { UsageBanners } from "./UsageBanners";

export function Header() {
  const { user } = userStore();
  const pathname = usePathname();

  return (
    <div className="flex flex-col">
      {user && !pathname.includes("/globe") && (
        <div className="flex flex-col px-2 md:px-4">
          <DemoSignupBanner />
          <AffiliateBanner />
          <FreePlanBanner />
          <UsageBanners />
          <NoData />
        </div>
      )}
    </div>
  );
}
