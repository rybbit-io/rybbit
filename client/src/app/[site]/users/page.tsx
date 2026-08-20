"use client";

import { useExtracted } from "next-intl";
import { useEffect } from "react";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/basic-tabs";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { getDashboardTimeForRange } from "../../../lib/defaultTimeRange";
import { USER_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getTimezone, useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { TraitsExplorer } from "./components/TraitsExplorer";
import { UsersTable } from "./components/UsersTable";

export default function UsersPage() {
  useSetPageTitle("Users");
  const t = useExtracted();

  // All time is an expensive default for a page people open constantly: the
  // user list aggregates every event the site has ever recorded, and the count
  // query behind it scanned 5.6 B rows over six days. Land on 30 days instead,
  // and let the date selector show that honestly — picking All time from the
  // selector still works, and this only runs on entry.
  useEffect(() => {
    const { time, setTime } = useStore.getState();
    if (time.mode === "all-time") {
      setTime(getDashboardTimeForRange("last-30-days", getTimezone()));
    }
  }, []);

  return (
    <DisabledOverlay message={t("Users")} featurePath="users">
      <div className="p-2 md:p-4 max-w-[1400px] mx-auto space-y-3">
        <SubHeader availableFilters={USER_PAGE_FILTERS} />
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">{t("Users")}</TabsTrigger>
            <TabsTrigger value="traits">{t("Traits")}</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UsersTable />
          </TabsContent>
          <TabsContent value="traits">
            <TraitsExplorer />
          </TabsContent>
        </Tabs>
      </div>
    </DisabledOverlay>
  );
}
