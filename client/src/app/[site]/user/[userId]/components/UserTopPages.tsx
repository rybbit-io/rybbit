import { useState } from "react";
import { useExtracted } from "next-intl";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Tabs } from "../../../../../components/ui/tabs";
import { truncateString } from "../../../../../lib/utils";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";

type Tab = "pages" | "events";

export function UserTopPages({ userId }: { userId: string }) {
  const t = useExtracted();
  const [tab, setTab] = useState<Tab>("pages");

  const { data: siteMetadata } = useGetSite();

  return (
    <Card>
      <CardContent className="mt-2">
        <Tabs defaultValue="pages" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 items-center">
            <TabsList>
              <TabsTrigger value="pages">{t("Top Pages")}</TabsTrigger>
            </TabsList>
            {/* <TabsList>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList> */}
          </div>
          <TabsContent value="pages">
            <StandardSection
              filterParameter="pathname"
              title={t("Pages")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => {
                const host = e.hostname || siteMetadata?.domain;
                return host ? `https://${host}${e.value}` : "#";
              }}
              expanded={false}
              close={close}
              customFilters={[{ parameter: "user_id", value: [userId], type: "equals" }]}
              customTime={{
                mode: "all-time",
                wellKnown: "all-time",
              }}
            />
          </TabsContent>
          <TabsContent value="events">
            <StandardSection
              filterParameter="pathname"
              title={t("Pages")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => {
                const host = e.hostname || siteMetadata?.domain;
                return host ? `https://${host}${e.value}` : "#";
              }}
              expanded={false}
              close={close}
              customFilters={[{ parameter: "user_id", value: [userId], type: "equals" }]}
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
