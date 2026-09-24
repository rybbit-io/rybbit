"use client";
import { ChevronRight, Expand, Globe } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { CountryFlag } from "@/app/[site]/components/shared/icons/CountryFlag";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/basic-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubdivisions } from "@/lib/geo";
import { getCountryName, getLanguageName } from "@/lib/utils";
import { RollupSection } from "./RollupSection";

type Tab = "countries" | "regions" | "cities" | "languages" | "timezones";

function getCountryCity(value: string) {
  if (value.split("-").length === 2) {
    const [country, city] = value.split("-");
    return { country, region: "", city };
  }
  const [country, region, city] = value.split("-");
  return { country, region, city };
}

const getCountryFromLanguage = (languageCode: string): string | null => {
  if (languageCode.includes("-")) {
    const [_, region] = languageCode.split("-");
    return region;
  }
  return null;
};

export function Countries({ siteIds }: { siteIds: number[] }) {
  const [tab, setTab] = useState<Tab>("countries");
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();
  const close = () => setExpanded(false);
  const { data: subdivisions } = useSubdivisions();

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs
          defaultValue="countries"
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
        >
          <div className="flex flex-row gap-2 justify-between items-center">
            <TabsList>
              <TabsTrigger value="countries">{t("Countries")}</TabsTrigger>
              <TabsTrigger value="regions">{t("Regions")}</TabsTrigger>
              <TabsTrigger value="cities">{t("Cities")}</TabsTrigger>
              <TabsTrigger value="languages">{t("Languages")}</TabsTrigger>
              <TabsTrigger value="timezones">{t("Timezones")}</TabsTrigger>
            </TabsList>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="countries">
            <RollupSection
              siteIds={siteIds}
              filterParameter="country"
              title={t("Countries")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getFilterLabel={(e) => getCountryName(e.value) || ""}
              getLabel={(e) => (
                <div className="flex gap-2 items-center">
                  <CountryFlag country={e.value} />
                  {getCountryName(e.value) || t("Unknown")}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="regions">
            <RollupSection
              siteIds={siteIds}
              filterParameter="region"
              title={t("Regions")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getFilterLabel={(e) => {
                const region = subdivisions?.features.find(
                  (f) => f.properties.iso_3166_2 === e.value
                )?.properties;
                return region?.name ?? "";
              }}
              getLabel={(e) => {
                if (!e.value) return t("Unknown");
                const region = subdivisions?.features.find(
                  (f) => f.properties.iso_3166_2 === e.value
                )?.properties;
                const countryCode = e.value.split("-")[0];
                return (
                  <div className="flex gap-2 items-center">
                    <CountryFlag country={countryCode} />
                    {countryCode}
                    <ChevronRight className="w-4 h-4 mx-[-4px]" />
                    {region?.name ?? e.value.slice(3)}
                  </div>
                );
              }}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="cities">
            <RollupSection
              siteIds={siteIds}
              filterParameter="city"
              title={t("Cities")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getLabel={(e) => {
                if (!e.value || e.value === "-") return t("Unknown");
                const { country, region, city } = getCountryCity(e.value) ?? {};
                const region_ = subdivisions?.features.find(
                  (f) => f.properties.iso_3166_2 === `${country}-${region}`
                )?.properties;
                return (
                  <div className="flex gap-2 items-center">
                    <CountryFlag country={country} />
                    {country}
                    {region_?.name && (
                      <ChevronRight className="w-4 h-4 mx-[-4px]" />
                    )}
                    {region_?.name}
                    {city && <ChevronRight className="w-4 h-4 mx-[-4px]" />}
                    {city}
                  </div>
                );
              }}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="languages">
            <RollupSection
              siteIds={siteIds}
              filterParameter="language"
              title={t("Languages")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getFilterLabel={(e) => getLanguageName(e.value) || ""}
              getLabel={(e) => (
                <div className="flex gap-2 items-center">
                  {getCountryFromLanguage(e.value) ? (
                    <CountryFlag country={getCountryFromLanguage(e.value)!} />
                  ) : (
                    <Globe className="w-5 h-5" />
                  )}
                  {getLanguageName(e.value) || e.value || t("Unknown")}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="timezones">
            <RollupSection
              siteIds={siteIds}
              filterParameter="timezone"
              title={t("Timezones")}
              getKey={(e) => e.value}
              getValue={(e) => e.value}
              getLabel={(e) => e.value || t("Unknown")}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
