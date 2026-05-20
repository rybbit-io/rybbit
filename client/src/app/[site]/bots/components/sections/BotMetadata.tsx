"use client";

import { Expand } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { truncateString } from "../../../../../lib/utils";
import { BotSection } from "../BotSection";

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
  const [tab, setTab] = useState<Tab>("asn_orgs");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="asn_orgs" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="asn_orgs">ASN Orgs</TabsTrigger>
                <TabsTrigger value="bot_categories">Categories</TabsTrigger>
                <TabsTrigger value="ua_patterns">UA Patterns</TabsTrigger>
              </TabsList>
            </div>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="asn_orgs">
            <BotSection
              dimension="asn_org"
              title="ASN Orgs"
              getValue={item => item.value}
              getKey={item => item.value || "unknown"}
              getLabel={item => item.value || "Unknown"}
              filterable={false}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="bot_categories">
            <BotSection
              dimension="bot_category"
              title="Bot Categories"
              getValue={item => item.value}
              getKey={item => item.value || "uncategorized"}
              getLabel={item => formatBotCategory(item.value)}
              filterable={false}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
          <TabsContent value="ua_patterns">
            <BotSection
              dimension="matched_ua_pattern"
              title="Matched UA Patterns"
              getValue={item => item.value}
              getKey={item => item.value || "none"}
              getLabel={item => truncateString(item.value, 70) || "No matched pattern"}
              filterable={false}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
