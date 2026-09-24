"use client";

import { useExtracted } from "next-intl";
import {
  StandardSectionTabs,
  type StandardSectionTab,
} from "../../../components/shared/StandardSection/StandardSectionTabs";
import { Browser } from "../../../components/shared/icons/Browser";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { DeviceIcon } from "../../../components/shared/icons/Device";

type Tab = "devices" | "browsers" | "os" | "dimensions";

export function Devices() {
  const t = useExtracted();

  const tabs: StandardSectionTab<Tab>[] = [
    {
      value: "browsers",
      label: t("Browsers"),
      section: {
        filterParameter: "browser",
        title: t("Browsers"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => (
          <div className="flex gap-2 items-center">
            <Browser browser={e.value} />
            {e.value || t("Other")}
          </div>
        ),
        getSubrowLabel: e => {
          const justBrowser = e.value.split(" ").slice(0, -1).join(" ");
          return (
            <div className="flex gap-2 items-center">
              <Browser browser={justBrowser || "Other"} />
              {e.value || t("Other")}
            </div>
          );
        },
        hasSubrow: true,
      },
    },
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
      },
    },
    {
      value: "os",
      label: t("Operating Systems"),
      section: {
        title: t("Operating Systems"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => (
          <div className="flex gap-2 items-center">
            <OperatingSystem os={e.value || "Other"} />
            {e.value || t("Other")}
          </div>
        ),
        getSubrowLabel: e => {
          const justOS = e.value.split(" ").slice(0, -1).join(" ");
          return (
            <div className="flex gap-2 items-center">
              <OperatingSystem os={justOS || "Other"} />
              {e.value || t("Other")}
            </div>
          );
        },
        filterParameter: "operating_system",
        hasSubrow: true,
      },
    },
    {
      value: "dimensions",
      label: t("Screen Dimensions"),
      section: {
        title: t("Screen Dimensions"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => <div className="flex gap-2 items-center">{e.value || t("Other")}</div>,
        filterParameter: "dimensions",
      },
    },
  ];

  return <StandardSectionTabs defaultValue="browsers" tabs={tabs} />;
}
