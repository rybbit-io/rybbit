"use client";

import { FreePlanBanner } from "../../../../components/FreePlanBanner";
import { userStore } from "../../../../lib/userStore";
import { NoData } from "./NoData";
import { UsageBanners } from "./UsageBanners";

export function Header() {
  const { user } = userStore();

  return (
    <div className="flex flex-col">
      {user && (
        <div className="flex flex-col px-4">
          <FreePlanBanner />
          <UsageBanners />
          <NoData />
        </div>
      )}
    </div>
  );
}
