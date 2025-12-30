"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/MultiSelect";

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
  return (
    <div className="flex items-center gap-6 mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-lg">
      <div className="flex items-center gap-2">
        <Switch id="show-zero-events" checked={showZeroEvents} onCheckedChange={setShowZeroEvents} />
        <Label htmlFor="show-zero-events" className="text-sm cursor-pointer">
          Show orgs with 0 events (30d)
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="show-only-over-limit" checked={showOnlyOverLimit} onCheckedChange={setShowOnlyOverLimit} />
        <Label htmlFor="show-only-over-limit" className="text-sm cursor-pointer">
          Only over limit
        </Label>
      </div>
      <div className="flex items-center gap-2 flex-1">
        <Label className="text-sm whitespace-nowrap">Subscription Tiers:</Label>
        <MultiSelect
          className="min-w-[200px] flex-1"
          options={availableTiers}
          value={selectedTiers}
          onChange={(newValue) => setSelectedTiers(newValue as TierOption[])}
          placeholder="All tiers"
          isClearable
        />
      </div>
    </div>
  );
}
