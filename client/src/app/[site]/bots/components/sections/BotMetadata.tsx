"use client";

import { truncateString } from "../../../../../lib/utils";
import { BotSectionTabs, type BotSectionTab } from "../BotSectionTabs";

type Tab = "asn_orgs" | "bot_categories" | "ua_patterns";

function formatBotCategory(value: string) {
  if (!value) return "Uncategorized";
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function BotMetadata() {
  const tabs: BotSectionTab<Tab>[] = [
    {
      value: "asn_orgs",
      label: "ASN Orgs",
      section: {
        dimension: "asn_org",
        title: "ASN Orgs",
        getValue: item => item.value,
        getKey: item => item.value || "unknown",
        getLabel: item => item.value || "Unknown",
        filterable: false,
      },
    },
    {
      value: "bot_categories",
      label: "Categories",
      section: {
        dimension: "bot_category",
        title: "Bot Categories",
        getValue: item => item.value,
        getKey: item => item.value || "uncategorized",
        getLabel: item => formatBotCategory(item.value),
        filterable: false,
      },
    },
    {
      value: "ua_patterns",
      label: "UA Patterns",
      section: {
        dimension: "matched_ua_pattern",
        title: "Matched UA Patterns",
        getValue: item => item.value,
        getKey: item => item.value || "none",
        getLabel: item => truncateString(item.value, 70) || "No matched pattern",
        filterable: false,
      },
    },
  ];

  return <BotSectionTabs defaultValue="asn_orgs" tabs={tabs} />;
}
