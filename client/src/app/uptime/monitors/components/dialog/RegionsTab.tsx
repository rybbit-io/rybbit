import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Server, Info, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../../../../../api/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CountryFlag } from "@/app/[site]/components/shared/icons/CountryFlag";
import { IS_CLOUD } from "@/lib/const";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Region {
  code: string;
  name: string;
  isHealthy: boolean;
  lastHealthCheck: string | null;
  isLocal: boolean;
}

export function RegionsTab() {
  const form = useFormContext();
  const monitoringType = IS_CLOUD ? "global" : "local";
  const selectedRegions = form.watch("selectedRegions") || [];

  const { data: regionsData, isLoading } = useQuery({
    queryKey: ["uptime-regions"],
    queryFn: async () => {
      const response = await authedFetch<{ regions: Region[] }>("/uptime/regions");
      return response.regions;
    },
  });

  const regions = regionsData || [];
  const globalRegions = regions.filter((r: Region) => !r.isLocal);

  // Set monitoring type on mount
  useEffect(() => {
    form.setValue("monitoringType", monitoringType);
    
    // For local monitoring, ensure "local" is selected
    if (!IS_CLOUD) {
      form.setValue("selectedRegions", ["local"]);
    }
  }, [monitoringType, form, IS_CLOUD]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  // Map region codes to country codes for flags
  const regionToCountry: Record<string, string> = {
    "us-east": "US",
    "us-west": "US",
    eu: "EU",
    asia: "SG",
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-medium flex items-center gap-2">
              {IS_CLOUD ? (
                <>
                  <Globe className="h-4 w-4" /> Global Monitoring
                </>
              ) : (
                <>
                  <Server className="h-4 w-4" /> Local Monitoring
                </>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {IS_CLOUD ? "Monitor from multiple regions worldwide" : "Monitor from your main server location only"}
            </p>
          </div>
        </div>
      </div>

      {IS_CLOUD ? (
        <>
          <FormField
            control={form.control}
            name="selectedRegions"
            render={() => (
              <FormItem>
                {/* <FormLabel>Select Regions</FormLabel>
                <FormDescription>
                  Choose which regions to monitor from. More regions provide better coverage.
                </FormDescription> */}
                <div className="space-y-4 mt-4">
                  {globalRegions.map((region: Region) => (
                    <FormField
                      key={region.code}
                      control={form.control}
                      name="selectedRegions"
                      render={({ field }) => {
                        const isSelected = field.value?.includes(region.code);
                        const isDisabled = !region.isHealthy;

                        return (
                          <FormItem>
                            <div className="flex items-center space-x-3">
                              <FormControl>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (!isDisabled) {
                                      let newValue: string[];
                                      if (checked) {
                                        newValue = [...(field.value || []), region.code];
                                      } else {
                                        newValue = field.value?.filter((value: string) => value !== region.code) || [];
                                        // Ensure at least one region is selected
                                        if (newValue.length === 0) {
                                          return; // Don't allow unchecking the last region
                                        }
                                      }
                                      field.onChange(newValue);
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-500"
                                />
                              </FormControl>
                              <div className="flex items-center gap-2 flex-1">
                                {regionToCountry[region.code] && (
                                  <CountryFlag country={regionToCountry[region.code]} className="w-5 h-3.5" />
                                )}
                                <label
                                  htmlFor={region.code}
                                  className={cn(
                                    "text-sm font-medium cursor-pointer",
                                    isDisabled && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  {region.name}
                                </label>
                                {!region.isHealthy && <span className="ml-auto text-xs text-red-500">Offline</span>}
                              </div>
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedRegions.length === 0 && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>Please select at least one region for global monitoring.</AlertDescription>
            </Alert>
          )}

          {selectedRegions.length === 1 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>At least one region must remain selected.</AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            Upgrade to Cloud or Enterprise tier to enable multi-region monitoring and get better uptime insights from
            multiple geographic locations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
