"use client";

import { useExtracted } from "next-intl";
import {
  StandardSectionTabs,
  type StandardSectionTab,
} from "../../../components/shared/StandardSection/StandardSectionTabs";
import { DeviceIcon } from "../../../components/shared/icons/Device";

// Lite Devices section: device type only.
export function DevicesLite() {
  const t = useExtracted();

  const tabs: StandardSectionTab<"devices">[] = [
    {
      value: "devices",
      label: t("Devices"),
      section: {
        filterParameter: "device_type",
        title: t("Devices"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => (
          <div className="flex gap-2 items-center">
            <DeviceIcon deviceType={e.value || ""} size={16} />
            {e.value || t("Other")}
          </div>
        ),
        lite: true,
      },
    },
  ];

  return <StandardSectionTabs defaultValue="devices" tabs={tabs} />;
}
