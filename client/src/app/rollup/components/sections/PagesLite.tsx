"use client";
import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { truncateString } from "@/lib/utils";
import { RollupSection } from "./RollupSection";

// Lite Pages section for the rollup: pathname only (the lite metric MV is
// keyed on pathname and doesn't expose titles/entries/exits/hostnames).
// Pathname collisions across sites get merged together — there's no per-site
// hostname column on the lite endpoint, so e.g. "/" buckets every site's home.
export function PagesLite({ siteIds }: { siteIds: number[] }) {
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <div className="flex flex-row gap-2 justify-between items-center mb-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 px-1">
            {t("Pages")}
          </div>
          <div className="w-7">
            <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
              <Expand className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <RollupSection
          siteIds={siteIds}
          filterParameter="pathname"
          title={t("Pages")}
          getKey={(e) => e.value}
          getValue={(e) => e.value}
          getLabel={(e) => truncateString(e.value, 50) || t("Other")}
          expanded={expanded}
          close={() => setExpanded(false)}
          lite
        />
      </CardContent>
    </Card>
  );
}
