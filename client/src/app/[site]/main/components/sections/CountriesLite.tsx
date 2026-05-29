"use client";

import { useExtracted } from "next-intl";
import { getCountryName } from "../../../../../lib/utils";
import {
  StandardSectionTabs,
  type StandardSectionTab,
} from "../../../components/shared/StandardSection/StandardSectionTabs";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";

// Lite Countries section: country only (regions/cities tabs require deeper
// dimensions than the country MV stores).
export function CountriesLite() {
  const t = useExtracted();

  const tabs: StandardSectionTab<"countries">[] = [
    {
      value: "countries",
      label: t("Countries"),
      section: {
        filterParameter: "country",
        title: t("Countries"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => (
          <div className="flex items-center gap-2">
            <CountryFlag country={e.value} />
            {getCountryName(e.value) || t("Unknown")}
          </div>
        ),
        lite: true,
      },
    },
  ];

  return <StandardSectionTabs defaultValue="countries" tabs={tabs} />;
}
