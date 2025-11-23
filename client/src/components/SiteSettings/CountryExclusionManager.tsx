"use client";

import { X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { useGetExcludedCountries, useUpdateExcludedCountries } from "@/api/admin/excludedCountries";
import { CountrySelector } from "./CountrySelector";

interface CountryExclusionManagerProps {
  siteId: number;
  disabled?: boolean;
}

export function CountryExclusionManager({ siteId, disabled = false }: CountryExclusionManagerProps) {
  const { data: excludedCountriesData, isLoading } = useGetExcludedCountries(siteId);
  const updateExcludedCountriesMutation = useUpdateExcludedCountries();

  const [countryList, setCountryList] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  React.useEffect(() => {
    if (excludedCountriesData?.excludedCountries) {
      setCountryList(excludedCountriesData.excludedCountries);
      setHasUnsavedChanges(false);
    }
  }, [excludedCountriesData]);

  const addCountry = (countryCode: string) => {
    if (!countryList.includes(countryCode)) {
      setCountryList([...countryList, countryCode]);
      setHasUnsavedChanges(true);
    }
  };

  const removeCountry = (countryCode: string) => {
    setCountryList(countryList.filter(c => c !== countryCode));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateExcludedCountriesMutation.mutateAsync({
        siteId,
        excludedCountries: countryList,
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    if (excludedCountriesData?.excludedCountries) {
      setCountryList(excludedCountriesData.excludedCountries);
    } else {
      setCountryList([]);
    }
    setHasUnsavedChanges(false);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading country exclusions...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-foreground block">Country Exclusions</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Exclude traffic from specific countries. Events from these countries will not be tracked in your analytics.
        </p>
      </div>

      <CountrySelector onSelect={addCountry} selectedCountries={countryList} disabled={disabled} />

      {countryList.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Excluded Countries ({countryList.length})</Label>
          <div className="flex flex-wrap gap-2">
            {countryList.map(countryCode => (
              <div
                key={countryCode}
                className="flex items-center space-x-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
              >
                <span>{countryCode}</span>
                <button
                  type="button"
                  onClick={() => removeCountry(countryCode)}
                  disabled={disabled}
                  className="ml-1 hover:text-destructive disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="flex items-center space-x-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={disabled || updateExcludedCountriesMutation.isPending}
            size="sm"
          >
            {updateExcludedCountriesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={disabled || updateExcludedCountriesMutation.isPending}
            size="sm"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
