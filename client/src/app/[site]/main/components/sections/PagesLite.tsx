"use client";

import { useExtracted } from "next-intl";
import { useConfigs } from "../../../../../lib/configs";
import { defaultToRouteGroups } from "../../../../../lib/routeGroups";
import { useStore, useTimezone } from "../../../../../lib/store";
import { Card } from "../../../../../components/ui/card";
import { RouteGroups } from "./RouteGroups";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { truncateString } from "../../../../../lib/utils";
import {
  StandardSectionTabs,
  type StandardSectionTab,
} from "../../../components/shared/StandardSection/StandardSectionTabs";

// Lite Pages section: pathname only (no titles/entries/exits/hostnames tabs —
// the MV is keyed on pathname).
export function PagesLite() {
  const { data: siteMetadata } = useGetSite();
  const t = useExtracted();
  const { configs, isLoading } = useConfigs();
  const time = useStore(state => state.time);
  const site = useStore(state => state.site);
  const zone = useTimezone();
  const defaultValue = configs?.routeGroups && defaultToRouteGroups(time, zone) ? "routes" : "pages";

  const tabs: StandardSectionTab<"pages" | "routes">[] = [
    {
      value: "pages",
      label: t("Pages"),
      section: {
        filterParameter: "pathname",
        title: t("Pages"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => truncateString(e.value, 50) || t("Other"),
        getLink: e => {
          const host = e.hostname || siteMetadata?.domain;
          return host ? `https://${host}${e.value}` : "#";
        },
        lite: true,
      },
    },
  ];

  if (configs?.routeGroups)
    tabs.unshift({
      value: "routes",
      label: t("Route groups"),
      content: <RouteGroups />,
      dialogContent: <RouteGroups expanded />,
    });
  // Wait for configuration before mounting a tab: otherwise the expensive URL
  // query starts before the long-range default switches to route groups.
  if (isLoading) return <Card className="h-[405px]" aria-busy="true" />;
  return <StandardSectionTabs key={`${site}:${defaultValue}`} defaultValue={defaultValue} tabs={tabs} />;
}
