"use client";

import { Browser } from "../../../components/shared/icons/Browser";
import { DeviceIcon } from "../../../components/shared/icons/Device";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { BotSectionTabs, type BotSectionTab } from "../BotSectionTabs";

type Tab = "browsers" | "browser_versions" | "devices" | "os" | "os_versions" | "dimensions";

export function BotDevices() {
  const tabs: BotSectionTab<Tab>[] = [
    {
      value: "browsers",
      label: "Browsers",
      section: {
        dimension: "browser",
        title: "Browsers",
        getValue: item => item.value,
        getKey: item => item.value || "other",
        getLabel: item => (
          <div className="flex gap-2 items-center">
            <Browser browser={item.value || "Other"} />
            {item.value || "Other"}
          </div>
        ),
      },
    },
    {
      value: "browser_versions",
      label: "Versions",
      section: {
        dimension: "browser_version",
        title: "Browser Versions",
        getValue: item => item.value,
        getKey: item => item.value || "other",
        getLabel: item => {
          const browser = item.value.split(" ").slice(0, -1).join(" ");
          return (
            <div className="flex gap-2 items-center">
              <Browser browser={browser || "Other"} />
              {item.value || "Other"}
            </div>
          );
        },
      },
    },
    {
      value: "devices",
      label: "Devices",
      section: {
        dimension: "device_type",
        title: "Devices",
        getValue: item => item.value,
        getKey: item => item.value || "other",
        getLabel: item => (
          <div className="flex gap-2 items-center">
            <DeviceIcon deviceType={item.value || ""} size={16} />
            {item.value || "Other"}
          </div>
        ),
      },
    },
    {
      value: "os",
      label: "OS",
      section: {
        dimension: "operating_system",
        title: "Operating Systems",
        getValue: item => item.value,
        getKey: item => item.value || "other",
        getLabel: item => (
          <div className="flex gap-2 items-center">
            <OperatingSystem os={item.value || "Other"} />
            {item.value || "Other"}
          </div>
        ),
      },
    },
    {
      value: "os_versions",
      label: "OS Versions",
      section: {
        dimension: "operating_system_version",
        title: "OS Versions",
        getValue: item => item.value,
        getKey: item => item.value || "other",
        getLabel: item => {
          const os = item.value.split(" ").slice(0, -1).join(" ");
          return (
            <div className="flex gap-2 items-center">
              <OperatingSystem os={os || "Other"} />
              {item.value || "Other"}
            </div>
          );
        },
      },
    },
    {
      value: "dimensions",
      label: "Dimensions",
      section: {
        dimension: "dimensions",
        title: "Screen Dimensions",
        getValue: item => item.value,
        getKey: item => item.value || "other",
        getLabel: item => item.value || "Other",
      },
    },
  ];

  return <BotSectionTabs defaultValue="browsers" tabs={tabs} />;
}
