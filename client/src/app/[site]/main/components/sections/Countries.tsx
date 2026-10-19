"use client";
import { ChevronRight, Globe } from "lucide-react";
import { useExtracted } from "next-intl";
import { parseCityValue, useGetRegionName } from "../../../../../lib/geo";
import { getCountryName, getLanguageName } from "../../../../../lib/utils";
import { MapComponent } from "../../../components/shared/Map/MapComponent";
import {
  StandardSectionTabs,
  type StandardSectionTab,
} from "../../../components/shared/StandardSection/StandardSectionTabs";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";

type Tab = "countries" | "regions" | "languages" | "cities" | "map" | "timezones";

// Helper to extract country code from language code
const getCountryFromLanguage = (languageCode: string): string | null => {
  if (languageCode.includes("-")) {
    const [_, region] = languageCode.split("-");
    return region;
  }
  return null;
};

export function Countries() {
  const t = useExtracted();
  const { getRegionName } = useGetRegionName();

  const tabs: StandardSectionTab<Tab>[] = [
    {
      value: "countries",
      label: t("Countries"),
      section: {
        filterParameter: "country",
        title: t("Countries"),
        getValue: e => e.value,
        getKey: e => e.value,
        getFilterLabel: e => getCountryName(e.value),
        getLabel: e => (
          <div className="flex gap-2 items-center">
            <CountryFlag country={e.value} />
            {getCountryName(e.value)}
          </div>
        ),
      },
    },
    {
      value: "regions",
      label: t("Regions"),
      section: {
        filterParameter: "region",
        title: t("Regions"),
        getValue: e => e.value,
        getKey: e => e.value,
        getFilterLabel: e => getRegionName(e.value),
        getLabel: e => {
          if (!e.value) {
            return t("Unknown");
          }

          const countryCode = e.value.split("-")[0];

          return (
            <div className="flex gap-2 items-center">
              <CountryFlag country={countryCode} />
              {countryCode}
              <ChevronRight className="w-4 h-4 mx-[-4px]" />
              {getRegionName(e.value) || e.value.slice(3)}
            </div>
          );
        },
      },
    },
    {
      value: "cities",
      label: t("Cities"),
      section: {
        filterParameter: "city",
        title: t("Cities"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => {
          if (!e.value || e.value === "-") {
            return t("Unknown");
          }

          const { country, region, city } = parseCityValue(e.value);
          const regionName = getRegionName(`${country}-${region}`);

          return (
            <div className="flex gap-2 items-center">
              <CountryFlag country={country} />
              {country}
              {regionName && <ChevronRight className="w-4 h-4 mx-[-4px]" />}
              {regionName}
              {city && <ChevronRight className="w-4 h-4 mx-[-4px]" />}
              {city}
            </div>
          );
        },
      },
    },
    {
      value: "languages",
      label: t("Languages"),
      section: {
        filterParameter: "language",
        title: t("Languages"),
        getValue: e => e.value,
        getKey: e => e.value,
        getFilterLabel: e => getLanguageName(e.value) ?? "",
        getLabel: e => (
          <div className="flex gap-2 items-center">
            {getCountryFromLanguage(e.value) ? (
              <CountryFlag country={getCountryFromLanguage(e.value)!} />
            ) : (
              <Globe className="w-5 h-5" />
            )}
            {getLanguageName(e.value)}
          </div>
        ),
      },
    },
    {
      value: "map",
      label: t("Map"),
      content: <MapComponent height="340px" />,
    },
    {
      value: "timezones",
      label: t("Timezones"),
      section: {
        filterParameter: "timezone",
        title: t("Timezones"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => e.value,
      },
    },
  ];

  return <StandardSectionTabs defaultValue="countries" tabs={tabs} />;
}
