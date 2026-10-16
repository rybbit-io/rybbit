"use client";

import { TabletSmartphone, Tag } from "lucide-react";
import { useExtracted } from "next-intl";
import {
  StandardSectionTabs,
  type StandardSectionTab,
} from "../../../components/shared/StandardSection/StandardSectionTabs";
import { Browser } from "../../../components/shared/icons/Browser";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { DeviceIcon } from "../../../components/shared/icons/Device";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";

type Tab = "devices" | "browsers" | "os" | "dimensions";

export function Devices() {
  const t = useExtracted();
  const { data: siteMetadata } = useGetSite();
  const isApp = siteMetadata?.type === "mobile";

  const tabs: StandardSectionTab<Tab>[] = [
    {
      value: "browsers",
      label: isApp ? t("App Versions") : t("Browsers"),
      section: isApp
        ? {
            filterParameter: "app_version",
            title: t("App Versions"),
            getValue: e => e.value,
            getKey: e => e.value,
            getLabel: e => (
              <div className="flex gap-2 items-center">
                <Tag className="w-4 h-4" />
                {e.value || t("Other")}
              </div>
            ),
          }
        : {
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
      section: isApp
        ? {
            filterParameter: "device_model",
            title: t("Devices"),
            getValue: e => e.value,
            getKey: e => e.value,
            getLabel: e => (
              <div className="flex gap-2 items-center">
                <TabletSmartphone className="w-4 h-4" />
                {e.value || t("Other")}
              </div>
            ),
          }
        : {
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
