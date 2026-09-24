"use client";

import { useState, useMemo } from "react";
import { useAdminOrganizations } from "@/api/admin/hooks/useAdminOrganizations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { cn, formatter } from "@/lib/utils";
import { DateTime } from "luxon";
import { Copy } from "lucide-react";
import { useExtracted } from "next-intl";
import { ErrorAlert } from "../shared/ErrorAlert";
import { GrowthChart } from "../shared/GrowthChart";
import { Panel } from "../shared/Panel";
import { StatStrip } from "../shared/StatStrip";
import { ServiceUsageChart } from "../shared/ServiceUsageChart";
import { SubscriptionTiersTable } from "./SubscriptionTiersTable";
import { OrganizationsTable } from "./OrganizationsTable";
import { OrganizationFilters, TierOption } from "./OrganizationFilters";
import { useFilteredOrganizations } from "./useFilteredOrganizations";

const TIME_PERIODS = ["30d", "60d", "120d", "all"] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

export function Organizations() {
  const { data: organizations, isLoading, isError } = useAdminOrganizations();
  const t = useExtracted();

  const [chartTab, setChartTab] = useState("growth");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter states
  const [showZeroEvents, setShowZeroEvents] = useState(true);
  const [showOnlyOverLimit, setShowOnlyOverLimit] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<TierOption[]>([]);

  // Time period for service usage chart
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30d");

  // Calculate available tiers from organizations data
  const availableTiers = useMemo(() => {
    if (!organizations) return [];
    const tiers = new Set(organizations.map(org => org.subscription.planName));
    return Array.from(tiers)
      .sort()
      .map(tier => ({ value: tier, label: tier }));
  }, [organizations]);

  // Calculate date range based on time period
  const { startDate, endDate } = useMemo(() => {
    const now = DateTime.now();
    const end = now.toFormat("yyyy-MM-dd");

    if (timePeriod === "all") {
      const start = "2025-05-01";
      return { startDate: start, endDate: end };
    }

    const days = timePeriod === "30d" ? 30 : timePeriod === "60d" ? 60 : 120;
    const start = now.minus({ days }).toFormat("yyyy-MM-dd");

    return { startDate: start, endDate: end };
  }, [timePeriod]);

  const filteredOrganizations = useFilteredOrganizations(organizations, {
    searchQuery,
    showZeroEvents,
    selectedTiers,
    showOnlyOverLimit,
  });

  const stats = useMemo(() => {
    const orgs = filteredOrganizations ?? [];
    const active = orgs.filter(org => org.sites.some(site => site.eventsLast30Days > 0)).length;
    const events24h = orgs.reduce(
      (total, org) => total + org.sites.reduce((sum, site) => sum + Number(site.eventsLast24Hours || 0), 0),
      0
    );
    const events30d = orgs.reduce(
      (total, org) => total + org.sites.reduce((sum, site) => sum + Number(site.eventsLast30Days || 0), 0),
      0
    );
    return { total: orgs.length, active, events24h, events30d };
  }, [filteredOrganizations]);

  if (isError) {
    return <ErrorAlert message={t("Failed to load organizations data. Please try again later.")} />;
  }

  const copyOwnerEmails = () => {
    if (!filteredOrganizations?.length) return;
    const emails = [...filteredOrganizations]
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap(org => org.members.filter(m => m.role === "owner").map(m => m.email))
      .filter(Boolean);
    const unique = [...new Set(emails)];
    navigator.clipboard.writeText(unique.join("\n"));
    toast.success(t("Copied {count} owner emails", { count: String(unique.length) }));
  };

  return (
    <div className="space-y-6">
      <Tabs value={chartTab} onValueChange={setChartTab}>
        <Panel
          flush
          title={
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="growth" className="h-7 px-2.5 text-xs">
                {t("Growth")}
              </TabsTrigger>
              <TabsTrigger value="usage" className="h-7 px-2.5 text-xs">
                {t("Usage")}
              </TabsTrigger>
              <TabsTrigger value="tiers" className="h-7 px-2.5 text-xs">
                {t("Tiers")}
              </TabsTrigger>
            </TabsList>
          }
          actions={
            chartTab === "usage" ? (
              <div className="flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800">
                {TIME_PERIODS.map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setTimePeriod(period)}
                    className={cn(
                      "h-6 rounded-md px-2 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500",
                      timePeriod === period
                        ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    )}
                  >
                    {period === "all" ? t("All") : period}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        >
          <TabsContent value="growth" className="mt-0 p-4">
            <GrowthChart data={organizations} title={t("Organizations")} />
          </TabsContent>
          <TabsContent value="usage" className="mt-0 p-4">
            <ServiceUsageChart startDate={startDate} endDate={endDate} />
          </TabsContent>
          <TabsContent value="tiers" className="mt-0 p-4">
            <SubscriptionTiersTable organizations={organizations} isLoading={isLoading} />
          </TabsContent>
        </Panel>
      </Tabs>

      <div className="space-y-3">
        <StatStrip
          isLoading={isLoading}
          stats={[
            { label: t("Organizations"), value: stats.total.toLocaleString() },
            {
              label: t("Active (30d)"),
              value: stats.active.toLocaleString(),
              hint: t("with events in the last 30 days"),
            },
            { label: t("Events (24h)"), value: formatter(stats.events24h) },
            { label: t("Events (30d)"), value: formatter(stats.events30d) },
          ]}
        />
        <OrganizationFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showZeroEvents={showZeroEvents}
          setShowZeroEvents={setShowZeroEvents}
          showOnlyOverLimit={showOnlyOverLimit}
          setShowOnlyOverLimit={setShowOnlyOverLimit}
          availableTiers={availableTiers}
          selectedTiers={selectedTiers}
          setSelectedTiers={setSelectedTiers}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={copyOwnerEmails}
              disabled={isLoading || !filteredOrganizations?.length}
            >
              <Copy className="h-3.5 w-3.5" />
              {t("Copy owner emails")}
            </Button>
          }
        />
        <OrganizationsTable organizations={filteredOrganizations} isLoading={isLoading} searchQuery={searchQuery} />
      </div>
    </div>
  );
}
