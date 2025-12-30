"use client";

import { useState, useMemo } from "react";
import { useAdminOrganizations } from "@/api/admin/getAdminOrganizations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateTime } from "luxon";
import { SearchInput } from "../shared/SearchInput";
import { ErrorAlert } from "../shared/ErrorAlert";
import { AdminLayout } from "../shared/AdminLayout";
import { GrowthChart } from "../shared/GrowthChart";
import { ServiceUsageChart } from "../shared/ServiceUsageChart";
import { SubscriptionTiersTable } from "./SubscriptionTiersTable";
import { OrganizationsTable } from "./OrganizationsTable";
import { OrganizationFilters, TierOption } from "./OrganizationFilters";
import { FilteredStatsCards } from "./FilteredStatsCards";
import { useFilteredOrganizations } from "./useFilteredOrganizations";

export function Organizations() {
  const { data: organizations, isLoading, isError } = useAdminOrganizations();

  const [searchQuery, setSearchQuery] = useState("");

  // Filter states
  const [showZeroEvents, setShowZeroEvents] = useState(true);
  const [showOnlyOverLimit, setShowOnlyOverLimit] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<TierOption[]>([]);

  // Time period for service usage chart
  const [timePeriod, setTimePeriod] = useState<"30d" | "60d" | "120d" | "all">("30d");

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

  if (isError) {
    return (
      <AdminLayout>
        <ErrorAlert message="Failed to load organizations data. Please try again later." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Tabs defaultValue="growth" className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="growth">Organization Growth</TabsTrigger>
            <TabsTrigger value="usage">Service Usage</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscription Tiers</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="growth">
          <GrowthChart data={organizations} color="#8b5cf6" title="Organizations" />
        </TabsContent>
        <TabsContent value="usage">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
            <Button
              size="sm"
              variant={timePeriod === "30d" ? "default" : "ghost"}
              onClick={() => setTimePeriod("30d")}
              className="h-7 text-xs"
            >
              30d
            </Button>
            <Button
              size="sm"
              variant={timePeriod === "60d" ? "default" : "ghost"}
              onClick={() => setTimePeriod("60d")}
              className="h-7 text-xs"
            >
              60d
            </Button>
            <Button
              size="sm"
              variant={timePeriod === "120d" ? "default" : "ghost"}
              onClick={() => setTimePeriod("120d")}
              className="h-7 text-xs"
            >
              120d
            </Button>
            <Button
              size="sm"
              variant={timePeriod === "all" ? "default" : "ghost"}
              onClick={() => setTimePeriod("all")}
              className="h-7 text-xs"
            >
              All Time
            </Button>
          </div>
          <ServiceUsageChart
            startDate={startDate}
            endDate={endDate}
            title={`Service-wide Usage - ${timePeriod === "all" ? "All Time" : `Last ${timePeriod}`}`}
          />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionTiersTable organizations={organizations} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      <div className="mb-4">
        <SearchInput
          placeholder="Search by name, slug, domain, or member email..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <OrganizationFilters
        showZeroEvents={showZeroEvents}
        setShowZeroEvents={setShowZeroEvents}
        showOnlyOverLimit={showOnlyOverLimit}
        setShowOnlyOverLimit={setShowOnlyOverLimit}
        availableTiers={availableTiers}
        selectedTiers={selectedTiers}
        setSelectedTiers={setSelectedTiers}
      />

      <FilteredStatsCards organizations={filteredOrganizations} isLoading={isLoading} />

      <OrganizationsTable
        organizations={filteredOrganizations}
        isLoading={isLoading}
        searchQuery={searchQuery}
      />
    </AdminLayout>
  );
}
