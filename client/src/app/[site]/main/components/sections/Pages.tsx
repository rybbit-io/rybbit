"use client";

import { useStore } from "@/lib/store";
import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";
import { truncateString } from "../../../../../lib/utils";

type Tab = "pages" | "page_title" | "entry_pages" | "exit_pages" | "hostname";

export function Pages() {
  const { data: siteMetadata } = useGetSite();
  const [tab, setTab] = useState<Tab>("pages");
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();
  const close = () => {
    setExpanded(false);
  };

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="pages" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="pages">{t("Pages")}</TabsTrigger>
                <TabsTrigger value="page_title">{t("Titles")}</TabsTrigger>
                <TabsTrigger value="entry_pages">{t("Entries")}</TabsTrigger>
                <TabsTrigger value="exit_pages">{t("Exits")}</TabsTrigger>
                <TabsTrigger value="hostname">{t("Hostnames")}</TabsTrigger>
              </TabsList>
            </div>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="pages">
            <StandardSection
              filterParameter="pathname"
              title={t("Pages")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || t("Other")}
              getLink={e => {
                const host = e.hostname || siteMetadata?.domain;
                return host ? `https://${host}${e.value}` : "#";
              }}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="page_title">
            <StandardSection
              filterParameter="page_title"
              title={t("Page Title")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || t("Other")}
              // getLink={(e) =>
              //   e.pathname
              //     ? `https://${siteMetadata?.domain}${e.pathname}`
              //     : "#"
              // }
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="entry_pages">
            <StandardSection
              filterParameter="entry_page"
              title={t("Entry Pages")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => e.value || t("Other")}
              getLink={e => {
                const host = e.hostname || siteMetadata?.domain;
                return host ? `https://${host}${e.value}` : "#";
              }}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="exit_pages">
            <StandardSection
              filterParameter="exit_page"
              title={t("Exit Pages")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => e.value || t("Other")}
              getLink={e => {
                const host = e.hostname || siteMetadata?.domain;
                return host ? `https://${host}${e.value}` : "#";
              }}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="hostname">
            <StandardSection
              filterParameter="hostname"
              title={t("Hostnames")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => e.value}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
