"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/MultiSelect";
import { useExtracted } from "next-intl";

export interface TierOption {
  value: string;
  label: string;
}

interface OrganizationFiltersProps {
  showZeroEvents: boolean;
  setShowZeroEvents: (value: boolean) => void;
  showOnlyOverLimit: boolean;
  setShowOnlyOverLimit: (value: boolean) => void;
  availableTiers: TierOption[];
  selectedTiers: TierOption[];
  setSelectedTiers: (tiers: TierOption[]) => void;
}

export function OrganizationFilters({
  showZeroEvents,
  setShowZeroEvents,
  showOnlyOverLimit,
  setShowOnlyOverLimit,
  availableTiers,
  selectedTiers,
  setSelectedTiers,
}: OrganizationFiltersProps) {
  const t = useExtracted();
  return (
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
  );
}
