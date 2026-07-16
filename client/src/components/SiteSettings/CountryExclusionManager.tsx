"use client";

import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import React, { useState } from "react";
import { toast } from "@/components/ui/sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { useGetExcludedCountries, useUpdateExcludedCountries } from "@/api/admin/hooks/useExcludedCountries";
import { CountrySelector, getCountryName } from "./CountrySelector";

interface CountryExclusionManagerProps {
  siteId: number;
  disabled?: boolean;
}

export function CountryExclusionManager({ siteId, disabled = false }: CountryExclusionManagerProps) {
  const t = useExtracted();
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
    return <div className="text-sm text-muted-foreground">{t("Loading country exclusions...")}</div>;
  }

  return (
    <div className="space-y-4">
      <CountrySelector onSelect={addCountry} selectedCountries={countryList} disabled={disabled} />

      {countryList.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            {t("Excluded Countries ({count})", { count: String(countryList.length) })}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {countryList.map(countryCode => (
              <div
                key={countryCode}
                className="flex items-center gap-1 rounded-md border border-neutral-150 bg-neutral-50 py-1 pl-2.5 pr-1 text-sm text-foreground dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span>{getCountryName(countryCode)}</span>
                <button
                  type="button"
                  onClick={() => removeCountry(countryCode)}
                  disabled={disabled}
                  aria-label={`${t("Remove")} ${getCountryName(countryCode)}`}
                  className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:opacity-50 dark:hover:text-red-400 dark:focus-visible:ring-neutral-300"
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
          <Button onClick={handleSave} disabled={disabled || updateExcludedCountriesMutation.isPending} size="sm">
            {updateExcludedCountriesMutation.isPending ? t("Saving...") : t("Save Changes")}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={disabled || updateExcludedCountriesMutation.isPending}
            size="sm"
          >
            {t("Reset")}
          </Button>
        </div>
      )}
    </div>
  );
}
