"use client";

import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { AdClicksChart } from "./components/AdClicksChart";
import { AdClicksCountries } from "./components/AdClicksCountries";
import { AdClicksPathnames } from "./components/AdClicksPathnames";

export default function AdsPage() {
  const { site } = useStore();

  if (!site) {
    return null;
  }

  return <AdsPageContent />;
}

function AdsPageContent() {
  useSetPageTitle("Rybbit · Ads");

  return (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
      <SubHeader />
      <AdClicksChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdClicksCountries />
        <AdClicksPathnames />
      </div>
    </div>
  );
}
