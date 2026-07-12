import { useState } from "react";
import { useExtracted } from "next-intl";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { truncateString } from "../../../../../lib/utils";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";
import { UserJourneys } from "./UserJourneys";

type Tab = "pages" | "events" | "journeys";

export function UserTopPages({ userId }: { userId: string }) {
  const t = useExtracted();
  const [tab, setTab] = useState<Tab>("pages");

  const { data: siteMetadata } = useGetSite();

  return (
    <Card>
      <Tabs defaultValue="pages" value={tab} onValueChange={value => setTab(value as Tab)}>
        <CardHeader className="gap-3 space-y-0 border-b border-neutral-100 pb-0 dark:border-neutral-850 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 pb-3">
            <CardTitle className="text-base">{t("Behavior")}</CardTitle>
            <CardDescription className="mt-1 text-neutral-600 dark:text-neutral-400">
              {t("Where this user went and the actions they took in the selected range.")}
            </CardDescription>
          </div>
          <div className="max-w-full overflow-x-auto">
            <TabsList className="min-w-max">
              <TabsTrigger value="pages">{t("Top Pages")}</TabsTrigger>
              <TabsTrigger value="events">{t("Events")}</TabsTrigger>
              <TabsTrigger value="journeys">{t("Journeys")}</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <TabsContent value="pages" className="mt-0">
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
              additionalFilters={[{ parameter: "user_id", value: [userId], type: "equals" }]}
            />
          </TabsContent>
          <TabsContent value="events" className="mt-0">
            <StandardSection
              filterParameter="event_name"
              title={t("Events")}
              countLabel={t("Count")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              additionalFilters={[{ parameter: "user_id", value: [userId], type: "equals" }]}
            />
          </TabsContent>
          <TabsContent value="journeys" className="mt-0">
            <UserJourneys userId={userId} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
