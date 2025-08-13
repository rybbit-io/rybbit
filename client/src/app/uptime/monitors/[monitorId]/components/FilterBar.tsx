"use client";

import { CountryFlag } from "@/app/[site]/components/shared/icons/CountryFlag";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Earth } from "lucide-react";
import { UptimeMonitor } from "../../../../../api/uptime/monitors";
import { TIME_RANGES, useUptimeStore } from "../../components/uptimeStore";
import { REGIONS } from "../../const";

interface FilterBarProps {
  monitor?: UptimeMonitor;
  isLoading: boolean;
}

export function FilterBar({ monitor, isLoading }: FilterBarProps) {
  const { timeRange, setTimeRange, selectedRegion, setSelectedRegion } = useUptimeStore();

  // Only show region filter for global monitors (multi-region)
  const showRegionFilter = monitor?.monitoringType === "global";

  return (
    <div className="flex items-center gap-2 justify-between">
      {/* Time Range Selector */}
      <div className="flex items-center gap-1">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.value}
            variant={timeRange === range.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeRange(range.value)}
            className="h-7 px-2 text-xs"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Region Filter - only show for multi-region monitors */}
      {showRegionFilter && !isLoading && (
        <Select
          value={selectedRegion || "all"}
          onValueChange={(value) => setSelectedRegion(value === "all" ? undefined : value)}
        >
          <SelectTrigger size="sm" className="w-[140px] ml-2">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent size="sm">
            {REGIONS.filter((region, i) => i === 0 || monitor?.selectedRegions.includes(region.code)).map((region) => (
              <SelectItem key={region.code} value={region.code} size="sm">
                <div className="flex items-center gap-2">
                  {region.countryCode ? (
                    <CountryFlag country={region.countryCode} className="w-4 h-3" />
                  ) : (
                    <Earth className="w-4 h-4" />
                  )}
                  <span>{region.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
