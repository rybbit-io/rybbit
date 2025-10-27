"use client";
import { ChevronRight, Expand, Globe } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { useSubdivisions } from "../../../../../lib/geo";
import { getCountryName, getLanguageName } from "../../../../../lib/utils";
import { MapComponent } from "../../../components/shared/Map/MapComponent";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";

type Tab = "countries" | "regions" | "languages" | "cities" | "map" | "timezones";

function getCountryCity(value: string) {
  if (value.split("-").length === 2) {
    const [country, city] = value.split("-");
    return { country, region: "", city };
  }
  const [country, region, city] = value.split("-");
  return { country, region, city };
}

// Helper to extract country code from language code
const getCountryFromLanguage = (languageCode: string): string | null => {
  if (languageCode.includes("-")) {
    const [_, region] = languageCode.split("-");
    return region;
  }
  return null;
};

export function Countries() {
  const [tab, setTab] = useState<Tab>("countries");
  const [expanded, setExpanded] = useState(false);
  const close = () => {
    setExpanded(false);
  };
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
              <TabsTrigger value="languages">Languages</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="timezones">Timezones</TabsTrigger>
            </TabsList>
            {tab !== "map" && (
              <div>
                <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                  <Expand className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <TabsContent value="countries">
            <StandardSection
              filterParameter="country"
              title="Countries"
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => getCountryName(e.value)}
              getLabel={e => {
                return (
                  <div className="flex gap-2 items-center">
                    <CountryFlag country={e.value} />
                    {getCountryName(e.value)}
                  </div>
                );
              }}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="regions">
            <StandardSection
              filterParameter="region"
              title="Regions"
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => {
                const region = subdivisions?.features.find(
                  feature => feature.properties.iso_3166_2 === e.value
                )?.properties;
                return region?.name ?? "";
              }}
              getLabel={e => {
                if (!e.value) {
                  return "Unknown";
                }

                const region = subdivisions?.features.find(
                  feature => feature.properties.iso_3166_2 === e.value
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
            <StandardSection
              filterParameter="city"
              title="Cities"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => {
                if (!e.value || e.value === "-") {
                  return "Unknown";
                }

                const { country, region, city } = getCountryCity(e.value) ?? {};

                const region_ = subdivisions?.features.find(
                  feature => feature.properties.iso_3166_2 === `${country}-${region}`
                )?.properties;

                return (
                  <div className="flex gap-2 items-center">
                    <CountryFlag country={country} />
                    {country}
                    {region_?.name && <ChevronRight className="w-4 h-4 mx-[-4px]" />}
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
            <StandardSection
              filterParameter="language"
              title="Languages"
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => getLanguageName(e.value) ?? ""}
              getLabel={e => (
                <div className="flex gap-2 items-center">
                  {getCountryFromLanguage(e.value) ? (
                    <CountryFlag country={getCountryFromLanguage(e.value)!} />
                  ) : (
                    <Globe className="w-5 h-5" />
                  )}
                  {getLanguageName(e.value)}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="timezones">
            <StandardSection
              filterParameter="timezone"
              title="Timezones"
              getValue={e => e.value}
              getKey={e => e.value}
              // getFilterLabel={e => getLanguageName(e.value) ?? ""}
              // getLabel={e => (
              //   <div className="flex gap-2 items-center">
              //     {getCountryFromLanguage(e.value) ? (
              //       <CountryFlag country={getCountryFromLanguage(e.value)!} />
              //     ) : (
              //       <Globe className="w-5 h-5" />
              //     )}
              //     {getLanguageName(e.value)}
              //   </div>
              // )}
              getLabel={e => e.value}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="map">
            <MapComponent height="340px" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
