"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/MultiSelect";
import { SearchInput } from "../shared/SearchInput";
import { useExtracted } from "next-intl";

export interface TierOption {
  value: string;
  label: string;
}

const QUICK_TIER_FILTERS = [
  { key: "appsumo", label: "AppSumo", match: (tier: string) => tier.toLowerCase().includes("appsumo") },
  { key: "basic", label: "Basic", match: (tier: string) => tier.toLowerCase().includes("basic") },
  { key: "standard", label: "Standard", match: (tier: string) => tier.toLowerCase().includes("standard") },
  { key: "pro", label: "Pro", match: (tier: string) => tier.toLowerCase().includes("pro") },
] as const;

interface OrganizationFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showZeroEvents: boolean;
  setShowZeroEvents: (value: boolean) => void;
  showOnlyOverLimit: boolean;
  setShowOnlyOverLimit: (value: boolean) => void;
  availableTiers: TierOption[];
  selectedTiers: TierOption[];
  setSelectedTiers: (tiers: TierOption[]) => void;
}

export function OrganizationFilters({
  searchQuery,
  setSearchQuery,
  showZeroEvents,
  setShowZeroEvents,
  showOnlyOverLimit,
  setShowOnlyOverLimit,
  availableTiers,
  selectedTiers,
  setSelectedTiers,
}: OrganizationFiltersProps) {
  const t = useExtracted();

  const handleQuickTierFilter = (filter: (typeof QUICK_TIER_FILTERS)[number]) => {
    const matchingTiers = availableTiers.filter((tier) => filter.match(tier.value));
    if (matchingTiers.length === 0) return;

    // Check if all matching tiers are already selected
    const allSelected = matchingTiers.every((mt) =>
      selectedTiers.some((st) => st.value === mt.value)
    );

    if (allSelected) {
      // Remove matching tiers
      setSelectedTiers(
        selectedTiers.filter((st) => !matchingTiers.some((mt) => mt.value === st.value))
      );
    } else {
      // Add matching tiers (without duplicates)
      const existing = new Set(selectedTiers.map((t) => t.value));
      const newTiers = [...selectedTiers, ...matchingTiers.filter((mt) => !existing.has(mt.value))];
      setSelectedTiers(newTiers);
    }
  };

  const isQuickFilterActive = (filter: (typeof QUICK_TIER_FILTERS)[number]) => {
    const matchingTiers = availableTiers.filter((tier) => filter.match(tier.value));
    return matchingTiers.length > 0 && matchingTiers.every((mt) =>
      selectedTiers.some((st) => st.value === mt.value)
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <SearchInput
          placeholder={t("Search by name, slug, domain, or member email...")}
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-sm"
        />
        <div className="flex items-center gap-1">
          {QUICK_TIER_FILTERS.map((filter) => (
            <Button
              key={filter.key}
              size="sm"
              variant={isQuickFilterActive(filter) ? "default" : "outline"}
              onClick={() => handleQuickTierFilter(filter)}
              className="h-9 text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-4 sm:flex-row flex-col sm:items-center">
        <div className="flex items-center gap-2">
          <Switch id="show-zero-events" checked={showZeroEvents} onCheckedChange={setShowZeroEvents} />
          <Label htmlFor="show-zero-events" className="text-sm cursor-pointer">
            {t("Show orgs with 0 events (30d)")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-only-over-limit" checked={showOnlyOverLimit} onCheckedChange={setShowOnlyOverLimit} />
          <Label htmlFor="show-only-over-limit" className="text-sm cursor-pointer">
            {t("Only over limit")}
          </Label>
        </div>
        <MultiSelect
          className="min-w-[200px] flex-1"
          options={availableTiers}
          value={selectedTiers}
          onChange={(newValue) => setSelectedTiers(newValue as TierOption[])}
          placeholder={t("All tiers")}
          isClearable
        />
      </div>
    </div>
  );
}
