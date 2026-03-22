"use client";
import { Expand } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Favicon } from "../../../../../components/Favicon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Crawler } from "../../../components/shared/icons/Crawler";
import { VPN } from "../../../components/shared/icons/VPN";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";

type Tab =
  | "vpn"
  | "crawler"
  | "datacenter"
  | "company"
  | "company_type"
  | "company_domain"
  | "asn_org"
  | "asn_type"
  | "asn_domain";

export function Network() {
  const [tab, setTab] = useState<Tab>("vpn");
  const [expanded, setExpanded] = useState(false);
  const t = useExtracted();
  const close = () => {
    setExpanded(false);
  };

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs defaultValue="vpn" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 justify-between items-center">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="vpn">{t("VPNs")}</TabsTrigger>
                <TabsTrigger value="crawler">{t("Crawlers")}</TabsTrigger>
                <TabsTrigger value="datacenter">{t("Datacenters")}</TabsTrigger>
                <TabsTrigger value="company">{t("Company")}</TabsTrigger>
                <TabsTrigger value="company_type">{t("Company Type")}</TabsTrigger>
                <TabsTrigger value="company_domain">{t("Company Domain")}</TabsTrigger>
                <TabsTrigger value="asn_org">{t("ASN Org")}</TabsTrigger>
                <TabsTrigger value="asn_type">{t("ASN Type")}</TabsTrigger>
                <TabsTrigger value="asn_domain">{t("ASN Domain")}</TabsTrigger>
              </TabsList>
            </div>
            <div className="w-7">
              <Button size="smIcon" onClick={() => setExpanded(!expanded)}>
                <Expand className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="vpn">
            <StandardSection
              filterParameter="vpn"
              title={t("VPN")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLabel={e => {
                return (
                  <div className="flex gap-2 items-center">
                    <VPN vpn={e.value} />
                    {e.value}
                  </div>
                );
              }}
            />
          </TabsContent>
          <TabsContent value="crawler">
            <StandardSection
              filterParameter="crawler"
              title={t("Crawler")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLabel={e => {
                return (
                  <div className="flex gap-2 items-center">
                    <Crawler crawler={e.value} />
                    {e.value}
                  </div>
                );
              }}
            />
          </TabsContent>
          <TabsContent value="datacenter">
            <StandardSection
              filterParameter="datacenter"
              title={t("Datacenter")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLabel={e => e.value}
            />
          </TabsContent>
          <TabsContent value="company">
            <StandardSection
              filterParameter="company"
              title={t("Company")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLabel={e => e.value}
            />
          </TabsContent>
          <TabsContent value="company_type">
            <StandardSection
              filterParameter="company_type"
              title={t("Company Type")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLabel={e => e.value}
            />
          </TabsContent>
          <TabsContent value="company_domain">
            <StandardSection
              filterParameter="company_domain"
              title={t("Company Domain")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLink={e => `https://${e.value}`}
              getLabel={e => (
                <div className="flex items-center">
                  <Favicon domain={e.value} className="w-4 mr-2" />
                  {e.value ? e.value : t("Unknown")}
                </div>
              )}
            />
          </TabsContent>
          <TabsContent value="asn_org">
            <StandardSection
              filterParameter="asn_org"
              title={t("ASN Org")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLabel={e => e.value}
            />
          </TabsContent>
          <TabsContent value="asn_type">
            <StandardSection
              filterParameter="asn_type"
              title={t("ASN Type")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLabel={e => e.value}
            />
          </TabsContent>
          <TabsContent value="asn_domain">
            <StandardSection
              filterParameter="asn_domain"
              title={t("ASN Domain")}
              getValue={e => e.value}
              getKey={e => e.value}
              getFilterLabel={e => e.value}
              expanded={expanded}
              close={close}
              getLink={e => `https://${e.value}`}
              getLabel={e => (
                <div className="flex items-center">
                  <Favicon domain={e.value} className="w-4 mr-2" />
                  {e.value ? e.value : t("Unknown")}
                </div>
              )}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
