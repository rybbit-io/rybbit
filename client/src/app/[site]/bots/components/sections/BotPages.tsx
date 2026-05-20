"use client";

import { Expand } from "lucide-react";
import { useState } from "react";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { truncateString } from "../../../../../lib/utils";
import { BotSection } from "../BotSection";

type Tab = "pages" | "hostnames";

export function BotPages() {
  const { data: siteMetadata } = useGetSite();
  const [tab, setTab] = useState<Tab>("pages");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="pages" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <TabsList>
              <TabsTrigger value="pages">Pages</TabsTrigger>
              <TabsTrigger value="hostnames">Hostnames</TabsTrigger>
            </TabsList>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="pages">
            <BotSection
              dimension="pathname"
              title="Pages"
              getValue={item => item.value}
              getKey={item => item.value || "unknown"}
              getLabel={item => truncateString(item.value, 50) || "Other"}
              getLink={item => {
                const host = item.hostname || siteMetadata?.domain;
                return host && item.value ? `https://${host}${item.value}` : undefined;
              }}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="hostnames">
            <BotSection
              dimension="hostname"
              title="Hostnames"
              getValue={item => item.value}
              getKey={item => item.value || "unknown"}
              getLabel={item => item.value || "Other"}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
