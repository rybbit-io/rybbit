"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { SearchInput } from "../shared/SearchInput";

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

function TierSelect({
  availableTiers,
  selectedTiers,
  setSelectedTiers,
  placeholder,
}: {
  availableTiers: TierOption[];
  selectedTiers: TierOption[];
  setSelectedTiers: (tiers: TierOption[]) => void;
  placeholder: string;
}) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);

  const isSelected = (val: string) => selectedTiers.some(s => s.value === val);

  const toggle = (option: TierOption) => {
    if (isSelected(option.value)) {
      setSelectedTiers(selectedTiers.filter(s => s.value !== option.value));
    } else {
      setSelectedTiers([...selectedTiers, option]);
    }
  };

  const removeOne = (val: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTiers(selectedTiers.filter(s => s.value !== val));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[200px] flex-1 justify-between min-h-9 h-auto py-1 font-normal"
        >
          <div className="flex flex-wrap gap-1">
            {selectedTiers.length > 0 ? (
              selectedTiers.map(option => (
                <Badge key={option.value} variant="secondary" className="gap-1 pr-1">
                  {option.label}
                  <button
                    type="button"
                    className="rounded-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 p-0.5"
                    onMouseDown={e => e.preventDefault()}
                    onClick={e => removeOne(option.value, e)}
                    aria-label={t("Remove")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("Search")} />
          <CommandList>
            <CommandEmpty>{t("No results")}</CommandEmpty>
            <CommandGroup>
              {availableTiers.map(option => {
                const checked = isSelected(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option)}
                    className="cursor-pointer"
                  >
                    <Checkbox checked={checked} className="mr-2" />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
    const matchingTiers = availableTiers.filter(tier => filter.match(tier.value));
    if (matchingTiers.length === 0) return;

    const allSelected = matchingTiers.every(mt =>
      selectedTiers.some(st => st.value === mt.value)
    );

    if (allSelected) {
      setSelectedTiers(
        selectedTiers.filter(st => !matchingTiers.some(mt => mt.value === st.value))
      );
    } else {
      const existing = new Set(selectedTiers.map(s => s.value));
      const newTiers = [...selectedTiers, ...matchingTiers.filter(mt => !existing.has(mt.value))];
      setSelectedTiers(newTiers);
    }
  };

  const isQuickFilterActive = (filter: (typeof QUICK_TIER_FILTERS)[number]) => {
    const matchingTiers = availableTiers.filter(tier => filter.match(tier.value));
    return (
      matchingTiers.length > 0 &&
      matchingTiers.every(mt => selectedTiers.some(st => st.value === mt.value))
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
          {QUICK_TIER_FILTERS.map(filter => (
            <Button
              key={filter.key}
              size="sm"
              variant={isQuickFilterActive(filter) ? "default" : "outline"}
              onClick={() => handleQuickTierFilter(filter)}
              className={cn("h-9 text-xs")}
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
          <Switch
            id="show-only-over-limit"
            checked={showOnlyOverLimit}
            onCheckedChange={setShowOnlyOverLimit}
          />
          <Label htmlFor="show-only-over-limit" className="text-sm cursor-pointer">
            {t("Only over limit")}
          </Label>
        </div>
        <TierSelect
          availableTiers={availableTiers}
          selectedTiers={selectedTiers}
          setSelectedTiers={setSelectedTiers}
          placeholder={t("All tiers")}
        />
      </div>
    </div>
  );
}
