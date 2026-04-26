"use client";

import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";
import { truncateString } from "../../../../../lib/utils";

// Lite Pages section: pathname only (no titles/entries/exits/hostnames tabs —
// the MV is keyed on pathname).
export function PagesLite() {
  const { data: siteMetadata } = useGetSite();
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <div className="flex flex-row gap-2 justify-between items-center mb-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 px-1">{t("Pages")}</div>
          <div className="w-7">
            <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
              <Expand className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <StandardSection
          filterParameter="pathname"
          title={t("Pages")}
          getValue={e => e.value}
          getKey={e => e.value}
          getLabel={e => truncateString(e.value, 50) || t("Other")}
          getLink={e => {
            const host = e.hostname || siteMetadata?.domain;
            return host ? `https://${host}${e.value}` : "#";
          }}
          expanded={expanded}
          close={() => setExpanded(false)}
          lite
        />
      </CardContent>
    </Card>
  );
}
