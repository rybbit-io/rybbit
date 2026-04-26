"use client";

import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { getCountryName } from "../../../../../lib/utils";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";

// Lite Countries section: country only (regions/cities tabs require deeper
// dimensions than the country MV stores).
export function CountriesLite() {
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <div className="flex flex-row gap-2 justify-between items-center mb-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 px-1">{t("Countries")}</div>
          <div className="w-7">
            <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
              <Expand className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <StandardSection
          filterParameter="country"
          title={t("Countries")}
          getValue={e => e.value}
          getKey={e => e.value}
          getLabel={e => (
            <div className="flex items-center gap-2">
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
