"use client";

import { FreePlanBanner } from "../../../../components/FreePlanBanner";
import { userStore } from "../../../../lib/userStore";
import { DemoSignupBanner } from "./DemoSignupBanner";
import { NoData } from "./NoData";
import { UsageBanners } from "./UsageBanners";

export function Header() {
  const { user } = userStore();

  return (
    <div className="flex flex-col">
      {user && (
        <div className="flex flex-col px-2 md:px-4">
          <DemoSignupBanner />
          <FreePlanBanner />
          <UsageBanners />
          <NoData />
        </div>
      )}
    </div>
  );
}
