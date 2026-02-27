"use client";
import { useGetLiveUserCount } from "../../../api/analytics/hooks/useGetLiveUserCount";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { IS_CLOUD } from "../../../lib/const";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { MainSection } from "./components/MainSection/MainSection";
import { Countries } from "./components/sections/Countries";
import { Devices } from "./components/sections/Devices";
import { Events } from "./components/sections/Events";
import { Network } from "./components/sections/Network";
import { Pages } from "./components/sections/Pages";
import { Referrers } from "./components/sections/Referrers";
import { SearchConsole } from "./components/sections/SearchConsole";
import { Weekdays } from "./components/sections/Weekdays";

export default function MainPage() {
  const { site } = useStore();

  if (!site) {
    return null;
  }

  return <MainPageContent />;
}

function MainPageContent() {
  const { data } = useGetLiveUserCount(5);

  useSetPageTitle(`${data?.count ?? "…"} user${data?.count === 1 ? "" : "s"} online`);

  return (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
      <SubHeader />
      <MainSection />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <Referrers />
        <Pages />
        <Devices />
        <Countries />
        <Events />
        <Weekdays />
        {IS_CLOUD && <Network />}
        {IS_CLOUD && <SearchConsole />}
      </div>
    </div>
  );
}
