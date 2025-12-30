"use client";
import { Expand } from "lucide-react";
import { useState } from "react";
import { ChannelIcon } from "../../../../../components/Channel";
import { Favicon } from "../../../../../components/Favicon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../components/ui/dropdown-menu";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";

type Tab = "referrers" | "channels" | "utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content";

export function Referrers() {
  const [tab, setTab] = useState<Tab>("referrers");
  const [expanded, setExpanded] = useState(false);
  const close = () => {
    setExpanded(false);
  };

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="referrers" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="referrers">Referrers</TabsTrigger>
                <TabsTrigger value="channels">Channels</TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild unstyled>
                    <div
                      className={`inline-flex items-center justify-center whitespace-nowrap border-b-2 py-1 text-sm font-medium transition-all cursor-pointer ${
                        tab.startsWith("utm_")
                          ? "border-neutral-950 text-neutral-950 dark:border-neutral-100 dark:text-neutral-50"
                          : "border-transparent text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {tab === "utm_source" && "Source"}
                      {tab === "utm_medium" && "Medium"}
                      {tab === "utm_campaign" && "Campaign"}
                      {tab === "utm_term" && "Term"}
                      {tab === "utm_content" && "Content"}
                      {!tab.startsWith("utm_") && "UTM"}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setTab("utm_source")}>Source</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTab("utm_medium")}>Medium</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTab("utm_campaign")}>Campaign</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTab("utm_term")}>Term</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTab("utm_content")}>Content</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* <TabsTrigger value="utm_source">Source</TabsTrigger>
                <TabsTrigger value="utm_medium">Medium</TabsTrigger>
                <TabsTrigger value="utm_campaign">Campaign</TabsTrigger>
                <TabsTrigger value="utm_term">Term</TabsTrigger>
                <TabsTrigger value="utm_content">Content</TabsTrigger> */}
              </TabsList>
            </div>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="referrers">
            <StandardSection
              filterParameter="referrer"
              title="Referrers"
              getValue={e => e.value}
              getKey={e => e.value}
              getLink={e => `https://${e.value}`}
              getLabel={e => (
                <div className="flex items-center">
                  <Favicon domain={e.value} className="w-4 mr-2" />
                  {e.value ? e.value : "Direct"}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="channels">
            <StandardSection
              filterParameter="channel"
              title="Channels"
              getValue={e => e.value}
              getKey={e => e.value}
              // getLink={(e) => `https://${e.value}`}
              getLabel={e => (
                <div className="flex items-center gap-2">
                  <ChannelIcon channel={e.value} /> {e.value}
                </div>
              )}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="utm_source">
            <StandardSection
              filterParameter="utm_source"
              title="UTM Source"
              getKey={e => e.value}
              getLabel={e => e.value}
              getValue={e => e.value}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="utm_medium">
            <StandardSection
              filterParameter="utm_medium"
              title="UTM Medium"
              getKey={e => e.value}
              getLabel={e => e.value}
              getValue={e => e.value}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="utm_campaign">
            <StandardSection
              filterParameter="utm_campaign"
              title="UTM Campaign"
              getKey={e => e.value}
              getLabel={e => e.value}
              getValue={e => e.value}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="utm_content">
            <StandardSection
              filterParameter="utm_content"
              title="UTM Content"
              getKey={e => e.value}
              getLabel={e => e.value}
              getValue={e => e.value}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
          <TabsContent value="utm_term">
            <StandardSection
              filterParameter="utm_term"
              title="UTM Term"
              getKey={e => e.value}
              getLabel={e => e.value}
              getValue={e => e.value}
              expanded={expanded}
              close={close}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
