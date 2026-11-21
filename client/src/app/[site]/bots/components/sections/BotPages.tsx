"use client";

import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { truncateString } from "../../../../../lib/utils";
import { BotSectionTabs, type BotSectionTab } from "../BotSectionTabs";

type Tab = "pages" | "hostnames";

export function BotPages() {
  const { data: siteMetadata } = useGetSite();

  const tabs: BotSectionTab<Tab>[] = [
    {
      value: "pages",
      label: "Pages",
      section: {
        dimension: "pathname",
        title: "Pages",
        getValue: item => item.value,
        getKey: item => item.value || "unknown",
        getLabel: item => truncateString(item.value, 50) || "Other",
        getLink: item => {
          const host = item.hostname || siteMetadata?.domain;
          return host && item.value ? `https://${host}${item.value}` : undefined;
        },
      },
    },
    {
      value: "hostnames",
      label: "Hostnames",
      section: {
        dimension: "hostname",
        title: "Hostnames",
        getValue: item => item.value,
        getKey: item => item.value || "unknown",
        getLabel: item => item.value || "Other",
      },
    },
  ];

  return <BotSectionTabs defaultValue="pages" tabs={tabs} />;
}
