import { useParams } from "next/navigation";
import { useState } from "react";
import { useGetSite } from "../../../../../api/admin/sites";
import { TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Tabs } from "../../../../../components/ui/tabs";
import { truncateString } from "../../../../../lib/utils";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";

type Tab = "pages" | "events";

export function UserTopPages() {
  const { userId } = useParams();
  const [tab, setTab] = useState<Tab>("pages");

  const { data: siteMetadata } = useGetSite();

  return (
    <Card>
      <CardContent className="mt-2">
        <Tabs defaultValue="pages" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 items-center">
            <TabsList>
              <TabsTrigger value="pages">Top Pages</TabsTrigger>
            </TabsList>
            {/* <TabsList>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList> */}
          </div>
          <TabsContent value="pages">
            <StandardSection
              filterParameter="pathname"
              title="Pages"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => `https://${siteMetadata?.domain}${e.value}`}
              expanded={false}
              close={close}
              customFilters={[{ parameter: "user_id", value: [userId as string], type: "equals" }]}
              customTime={{
                mode: "all-time",
                wellKnown: "all-time",
              }}
            />
          </TabsContent>
          <TabsContent value="events">
            <StandardSection
              filterParameter="pathname"
              title="Pages"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => `https://${siteMetadata?.domain}${e.value}`}
              expanded={false}
              close={close}
              customFilters={[{ parameter: "user_id", value: [userId as string], type: "equals" }]}
              customTime={{
                mode: "all-time",
                wellKnown: "all-time",
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
