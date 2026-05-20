"use client";

import { ReactNode } from "react";
import { BOT_AVAILABLE_FILTERS } from "../../../api/analytics/hooks/bots/constants";
import { useInView } from "../../../hooks/useInView";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { BotChart } from "./components/BotChart";
import { BotsOverview } from "./components/BotsOverview";
import { BotCountries } from "./components/sections/BotCountries";
import { BotDevices } from "./components/sections/BotDevices";
import { BotMetadata } from "./components/sections/BotMetadata";
import { BotPages } from "./components/sections/BotPages";
import { BotReferrers } from "./components/sections/BotReferrers";

function LazySection({ children, height = "405px" }: { children: ReactNode; height?: string }) {
  const { ref, isInView } = useInView({ persistVisibility: true, rootMargin: "100px 0px" });
  return (
    <div ref={ref} style={{ minHeight: isInView ? undefined : height }}>
      {isInView ? children : null}
    </div>
  );
}

export default function BotsPage() {
  const { site } = useStore();
  useSetPageTitle("Bots");

  if (!site) {
    return null;
  }

  return (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
      <SubHeader availableFilters={BOT_AVAILABLE_FILTERS} />
      <div className="space-y-4">
        <BotsOverview />
        <BotChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <LazySection>
          <BotReferrers />
        </LazySection>
        <LazySection>
          <BotPages />
        </LazySection>
        <LazySection>
          <BotDevices />
        </LazySection>
        <LazySection>
          <BotCountries />
        </LazySection>
        <LazySection>
          <BotMetadata />
        </LazySection>
      </div>
    </div>
  );
}
