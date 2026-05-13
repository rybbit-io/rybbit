"use client";

import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";
import { DeviceIcon } from "../../../components/shared/icons/Device";

// Lite Devices section: device type only.
export function DevicesLite() {
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <div className="flex flex-row gap-2 justify-between items-center mb-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 px-1">{t("Devices")}</div>
          <div className="w-7">
            <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
              <Expand className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <StandardSection
          filterParameter="device_type"
          title={t("Devices")}
          getValue={e => e.value}
          getKey={e => e.value}
          getLabel={e => (
            <div className="flex gap-2 items-center">
              <DeviceIcon deviceType={e.value || ""} size={16} />
              {e.value || t("Other")}
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
