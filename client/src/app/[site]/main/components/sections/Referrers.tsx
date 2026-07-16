"use client";
import { useExtracted } from "next-intl";
import { ChannelIcon } from "../../../../../components/Channel";
import { Favicon } from "../../../../../components/Favicon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../components/ui/dropdown-menu";
import { cn } from "../../../../../lib/utils";
import {
  StandardSectionTabs,
  type StandardSectionTab,
} from "../../../components/shared/StandardSection/StandardSectionTabs";

type Tab = "referrers" | "channels" | "utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content";

export function Referrers() {
  const t = useExtracted();

  const tabs: StandardSectionTab<Tab>[] = [
    {
      value: "referrers",
      label: t("Referrers"),
      section: {
        filterParameter: "referrer",
        title: t("Referrers"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLink: e => `https://${e.value}`,
        getLabel: e => (
          <div className="flex items-center">
            <Favicon domain={e.value} className="w-4 mr-2" />
            {e.value ? e.value : t("Direct")}
          </div>
        ),
      },
    },
    {
      value: "channels",
      label: t("Channels"),
      section: {
        filterParameter: "channel",
        title: t("Channels"),
        getValue: e => e.value,
        getKey: e => e.value,
        getLabel: e => (
          <div className="flex items-center gap-2">
            <ChannelIcon channel={e.value} /> {e.value}
          </div>
        ),
      },
    },
    {
      value: "utm_source",
      label: t("Source"),
      showInTabs: false,
      section: {
        filterParameter: "utm_source",
        title: t("UTM Source"),
        getKey: e => e.value,
        getLabel: e => e.value,
        getValue: e => e.value,
      },
    },
    {
      value: "utm_medium",
      label: t("Medium"),
      showInTabs: false,
      section: {
        filterParameter: "utm_medium",
        title: t("UTM Medium"),
        getKey: e => e.value,
        getLabel: e => e.value,
        getValue: e => e.value,
      },
    },
    {
      value: "utm_campaign",
      label: t("Campaign"),
      showInTabs: false,
      section: {
        filterParameter: "utm_campaign",
        title: t("UTM Campaign"),
        getKey: e => e.value,
        getLabel: e => e.value,
        getValue: e => e.value,
      },
    },
    {
      value: "utm_term",
      label: t("Term"),
      showInTabs: false,
      section: {
        filterParameter: "utm_term",
        title: t("UTM Term"),
        getKey: e => e.value,
        getLabel: e => e.value,
        getValue: e => e.value,
      },
    },
    {
      value: "utm_content",
      label: t("Content"),
      showInTabs: false,
      section: {
        filterParameter: "utm_content",
        title: t("UTM Content"),
        getKey: e => e.value,
        getLabel: e => e.value,
        getValue: e => e.value,
      },
    },
  ];

  const renderUtmMenu = (value: Tab, setValue: (value: Tab) => void) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild unstyled>
        <div
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap border-b-2 py-1 text-sm font-medium transition-all cursor-pointer",
            value.startsWith("utm_")
              ? "border-neutral-950 text-neutral-950 dark:border-neutral-100 dark:text-neutral-50"
              : "border-transparent text-neutral-600 dark:text-neutral-400"
          )}
        >
          {value === "utm_source" && t("Source")}
          {value === "utm_medium" && t("Medium")}
          {value === "utm_campaign" && t("Campaign")}
          {value === "utm_term" && t("Term")}
          {value === "utm_content" && t("Content")}
          {!value.startsWith("utm_") && t("UTM")}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[10000]">
        <DropdownMenuItem onClick={() => setValue("utm_source")}>{t("Source")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setValue("utm_medium")}>{t("Medium")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setValue("utm_campaign")}>{t("Campaign")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setValue("utm_term")}>{t("Term")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setValue("utm_content")}>{t("Content")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <StandardSectionTabs
      defaultValue="referrers"
      tabs={tabs}
      renderTabsListEnd={({ value, setValue }) => renderUtmMenu(value, setValue)}
    />
  );
}
