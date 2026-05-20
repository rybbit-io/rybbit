"use client";

import { Expand } from "lucide-react";
import { useState } from "react";
import { Favicon } from "../../../../../components/Favicon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { BotSection } from "../BotSection";

export function BotReferrers() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="referrers">
          <div className="flex flex-row gap-2 justify-between items-center">
            <TabsList>
              <TabsTrigger value="referrers">Referrers</TabsTrigger>
            </TabsList>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="referrers">
            <BotSection
              dimension="referrer"
              title="Referrers"
              getValue={item => item.value}
              getKey={item => item.value || "direct"}
              getLink={item => (item.value ? `https://${item.value}` : undefined)}
              getLabel={item => (
                <div className="flex items-center">
                  {item.value && <Favicon domain={item.value} className="w-4 mr-2" />}
                  {item.value || "Direct"}
                </div>
              )}
              expanded={expanded}
              close={() => setExpanded(false)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
