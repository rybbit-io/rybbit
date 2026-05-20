"use client";

import { ChevronRight, Expand } from "lucide-react";
import { useState } from "react";
import { useSubdivisions } from "../../../../../lib/geo";
import { getCountryName } from "../../../../../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { BotSection } from "../BotSection";

type Tab = "countries" | "regions" | "cities";

function getCountryCity(value: string) {
  if (value.split("-").length === 2) {
    const [country, city] = value.split("-");
    return { country, region: "", city };
  }
  const [country, region, city] = value.split("-");
  return { country, region, city };
}

export function BotCountries() {
  const [tab, setTab] = useState<Tab>("countries");
  const [expanded, setExpanded] = useState(false);
  const { data: subdivisions } = useSubdivisions();

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="countries" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <TabsList>
              <TabsTrigger value="countries">Countries</TabsTrigger>
              <TabsTrigger value="regions">Regions</TabsTrigger>
              <TabsTrigger value="cities">Cities</TabsTrigger>
            </TabsList>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="countries">
            <BotSection
              dimension="country"
              title="Countries"
              getValue={item => item.value}
              getKey={item => item.value || "unknown"}
              getLabel={item => (
                <div className="flex gap-2 items-center">
                  {item.value && <CountryFlag country={item.value} />}
                  {item.value ? getCountryName(item.value) : "Unknown"}
                </div>
              )}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="regions">
            <BotSection
              dimension="region"
              title="Regions"
              getValue={item => item.value}
              getKey={item => item.value || "unknown"}
              getLabel={item => {
                if (!item.value) return "Unknown";
                const region = subdivisions?.features.find(
                  feature => feature.properties.iso_3166_2 === item.value
                )?.properties;
                const countryCode = item.value.split("-")[0];

                return (
                  <div className="flex gap-2 items-center">
                    <CountryFlag country={countryCode} />
                    {countryCode}
                    <ChevronRight className="w-4 h-4 mx-[-4px]" />
                    {region?.name ?? item.value.slice(3)}
                  </div>
                );
              }}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="cities">
            <BotSection
              dimension="city"
              title="Cities"
              getValue={item => item.value}
              getKey={item => item.value || "unknown"}
              getLabel={item => {
                if (!item.value || item.value === "-") return "Unknown";
                const { country, region, city } = getCountryCity(item.value);
                const regionName = subdivisions?.features.find(
                  feature => feature.properties.iso_3166_2 === `${country}-${region}`
                )?.properties.name;

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
              }}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
