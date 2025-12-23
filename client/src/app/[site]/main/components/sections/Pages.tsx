"use client";

import { useStore } from "@/lib/store";
import { Expand } from "lucide-react";
import { useState } from "react";
import { useGetSite } from "../../../../../api/admin/sites";
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
                <TabsTrigger value="pages">Pages</TabsTrigger>
                <TabsTrigger value="page_title">Titles</TabsTrigger>
                <TabsTrigger value="entry_pages">Entries</TabsTrigger>
                <TabsTrigger value="exit_pages">Exits</TabsTrigger>
                <TabsTrigger value="hostname">Hostnames</TabsTrigger>
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
              title="Pages"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => `https://${siteMetadata?.domain}${e.value}`}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="page_title">
            <StandardSection
              filterParameter="page_title"
              title="Page Title"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
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
              title="Entry Pages"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => e.value || "Other"}
              getLink={e => `https://${siteMetadata?.domain}${e.value}`}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="exit_pages">
            <StandardSection
              filterParameter="exit_page"
              title="Exit Pages"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => e.value || "Other"}
              getLink={e => `https://${siteMetadata?.domain}${e.value}`}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="hostname">
            <StandardSection
              filterParameter="hostname"
              title="Hostnames"
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
