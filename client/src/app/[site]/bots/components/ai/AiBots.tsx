"use client";

import { BotSectionTabs, type BotSectionTab } from "../BotSectionTabs";
import { formatBotPurpose } from "./aiLabels";

type Tab = "bots" | "purposes" | "operators";

/** Who is reading the site, at three levels of resolution. */
export function AiBots() {
  const tabs: BotSectionTab<Tab>[] = [
    {
      value: "bots",
      label: "Bots",
      section: {
        dimension: "bot_name",
        title: "AI bots",
        purpose: "ai",
        getValue: item => item.value,
        getKey: item => item.value || "unnamed",
        // A bot whose user agent matched only a generic pattern has no
        // published name. Empty rows also come from before identity shipped.
        getLabel: item => item.value || "Unnamed",
        filterable: false,
      },
    },
    {
      value: "purposes",
      label: "Purpose",
      section: {
        dimension: "bot_purpose",
        title: "What they came for",
        purpose: "ai",
        getValue: item => item.value,
        getKey: item => item.value || "unclassified",
        getLabel: item => formatBotPurpose(item.value),
        filterable: false,
      },
    },
    {
      value: "operators",
      label: "Operators",
      section: {
        dimension: "bot_operator",
        title: "AI operators",
        purpose: "ai",
        getValue: item => item.value,
        getKey: item => item.value || "unknown",
        getLabel: item => item.value || "Unknown",
        filterable: false,
      },
    },
  ];

  return <BotSectionTabs defaultValue="bots" tabs={tabs} />;
}
