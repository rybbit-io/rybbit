"use client";
import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { CountryFlag } from "@/app/[site]/components/shared/icons/CountryFlag";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCountryName } from "@/lib/utils";
import { RollupSection } from "./RollupSection";

// Lite Countries section for the rollup: country only (the lite metric MV is
// keyed on country and doesn't expose region/city/language/timezone).
export function CountriesLite({ siteIds }: { siteIds: number[] }) {
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <div className="flex flex-row gap-2 justify-between items-center mb-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 px-1">
            {t("Countries")}
          </div>
          <div className="w-7">
            <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
              <Expand className="w-4 h-4" />
            </Button>
          </div>
        </div>
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
          close={() => setExpanded(false)}
          lite
        />
      </CardContent>
    </Card>
  );
}
