"use client";

import { useExtracted } from "next-intl";
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

  const tabs: StandardSectionTab<"pages">[] = [
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

  return <StandardSectionTabs defaultValue="pages" tabs={tabs} />;
}
