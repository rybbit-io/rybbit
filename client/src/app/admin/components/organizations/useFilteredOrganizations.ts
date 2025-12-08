import { useMemo } from "react";
import { AdminOrganizationData } from "@/api/admin/getAdminOrganizations";
import { TierOption } from "./OrganizationFilters";

interface FilterOptions {
  searchQuery: string;
  showZeroEvents: boolean;
  selectedTiers: TierOption[];
  showOnlyOverLimit: boolean;
}

export function useFilteredOrganizations(
  organizations: AdminOrganizationData[] | undefined,
  { searchQuery, showZeroEvents, selectedTiers, showOnlyOverLimit }: FilterOptions
) {
  return useMemo(() => {
    if (!organizations) return [];

    let filtered = organizations;

    // Apply search filter
    if (searchQuery.trim()) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(org => {
        return (
          org.name.toLowerCase().includes(lowerSearchQuery) ||
          org.sites.some(site => site.domain.toLowerCase().includes(lowerSearchQuery)) ||
          org.members.some(
            member =>
              member.email.toLowerCase().includes(lowerSearchQuery) ||
              member.name.toLowerCase().includes(lowerSearchQuery)
          )
        );
      });
    }

    // Filter out organizations with 0 events in last 30 days
    if (!showZeroEvents) {
      filtered = filtered.filter(org => org.sites.some(site => site.eventsLast30Days > 0));
    }

    // Filter by selected subscription tiers (if any selected)
    if (selectedTiers.length > 0) {
      const tierValues = selectedTiers.map(t => t.value);
      filtered = filtered.filter(org => tierValues.includes(org.subscription.planName));
    }

    // Show only organizations over their event limit
    if (showOnlyOverLimit) {
      filtered = filtered.filter(org => org.overMonthlyLimit);
    }

    return filtered;
  }, [organizations, searchQuery, showZeroEvents, selectedTiers, showOnlyOverLimit]);
}
