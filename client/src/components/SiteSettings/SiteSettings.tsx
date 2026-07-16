"use client";

import {
  Ban,
  Code,
  Download,
  Gauge,
  LayoutDashboard,
  LayoutTemplate,
  Plug,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import { ScriptBuilder } from "./ScriptBuilder";
import { ImportManager } from "./ImportManager";
import { GeneralTab } from "./GeneralTab";
import { TrackingTab } from "./TrackingTab";
import { ExclusionsTab } from "./ExclusionsTab";
import { IntegrationsTab } from "./IntegrationsTab";
import { EmbedTab } from "./EmbedTab";
import { DashboardEmbedTab } from "./DashboardEmbedTab";
import { UsageTab } from "./UsageTab";
import { useGetSite } from "../../api/admin/hooks/useSites";
import { useUserOrganizations } from "../../api/admin/hooks/useOrganizations";
import { useGetSitesFromOrg } from "../../api/admin/hooks/useSites";
import { SiteResponse, updateSiteConfig } from "../../api/admin/endpoints";
import { IS_CLOUD } from "../../lib/const";

export function SiteSettings({ siteId, trigger }: { siteId: number; trigger?: React.ReactNode }) {
  const { data: siteMetadata, isLoading, error } = useGetSite(siteId);

  if (isLoading || !siteMetadata || error) {
    return null;
  }

  return <SiteSettingsInner siteMetadata={siteMetadata} trigger={trigger} />;
}

type TabKey =
  | "general"
  | "tracking"
  | "exclusions"
  | "integrations"
  | "script"
  | "import"
  | "widget-embeds"
  | "dashboard-embed"
  | "usage";

function SiteSettingsInner({ siteMetadata, trigger }: { siteMetadata: SiteResponse; trigger?: React.ReactNode }) {
  const t = useExtracted();
  const { data: userOrganizationsData } = useUserOrganizations();
  const siteOrgMembership = userOrganizationsData?.find(org => org.id === siteMetadata.organizationId);
  const disabled = !siteOrgMembership?.role || siteOrgMembership.role === "member";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [embedEnabled, setEmbedEnabled] = useState(!!siteMetadata.embedEnabled);
  const [togglingEmbed, setTogglingEmbed] = useState(false);
  const [sitePublic, setSitePublic] = useState(!!siteMetadata.public);
  const { refetch: refetchOrgSites } = useGetSitesFromOrg(siteMetadata?.organizationId ?? "");

  useEffect(() => {
    setEmbedEnabled(!!siteMetadata.embedEnabled);
    setSitePublic(!!siteMetadata.public);
  }, [siteMetadata.siteId, siteMetadata.embedEnabled, siteMetadata.public]);

  const handleToggleEmbed = useCallback(
    async (checked: boolean) => {
      setTogglingEmbed(true);
      try {
        await updateSiteConfig(siteMetadata.siteId, { embedEnabled: checked });
        setEmbedEnabled(checked);
        toast.success(checked ? t("Embed widget enabled") : t("Embed widget disabled"));
        refetchOrgSites();
      } catch (error) {
        console.error("Error toggling embed:", error);
        toast.error(t("Failed to update embed setting"));
      } finally {
        setTogglingEmbed(false);
      }
    },
    [siteMetadata.siteId, refetchOrgSites, t]
  );

  if (!siteMetadata) {
    return null;
  }

  const currentSiteMetadata = { ...siteMetadata, public: sitePublic };
  const isMobileSite = currentSiteMetadata.type === "mobile";

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; hidden?: boolean }[] = [
    { key: "general", label: t("General"), icon: Settings },
    { key: "tracking", label: t("Tracking"), icon: SlidersHorizontal },
    { key: "exclusions", label: t("Exclusions"), icon: Ban },
    { key: "integrations", label: t("Integrations"), icon: Plug, hidden: !IS_CLOUD },
    { key: "script", label: isMobileSite ? t("React Native SDK") : t("Tracking Script"), icon: Code },
    { key: "widget-embeds", label: t("Widget Embeds"), icon: LayoutTemplate },
    { key: "dashboard-embed", label: t("Dashboard Embed"), icon: LayoutDashboard },
    { key: "import", label: t("Import"), icon: Download },
    { key: "usage", label: t("Usage"), icon: Gauge },
  ];

  const visibleTabs = tabs.filter(t => !t.hidden);
  const currentTab = visibleTabs.find(t => t.key === activeTab) ?? visibleTabs[0];

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden" hideClose>
        <div className="flex h-[80vh]">
          <aside className="w-[220px] shrink-0 border-r border-neutral-200 dark:border-neutral-850 bg-neutral-50 dark:bg-neutral-900/50 p-3 flex flex-col gap-1">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="self-start mb-2 h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">{t("Close")}</span>
              </Button>
            </DialogClose>
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-left transition-colors",
                    isActive
                      ? "bg-neutral-200/70 text-foreground dark:bg-neutral-800 dark:text-neutral-50"
                      : "text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </aside>

          <main className="flex-1 flex flex-col min-w-0">
            <header className="px-6 pt-5 pb-3 border-b border-neutral-200 dark:border-neutral-850 flex items-center justify-between gap-4">
              <DialogTitle className="text-lg font-semibold mb-0">{currentTab.label}</DialogTitle>
              {activeTab === "widget-embeds" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  {t("Widget Enabled")}
                  <Switch
                    aria-label={t("Enable Embed Widget")}
                    checked={embedEnabled}
                    disabled={togglingEmbed}
                    onCheckedChange={handleToggleEmbed}
                  />
                </label>
              )}
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === "general" && (
                <GeneralTab
                  siteMetadata={currentSiteMetadata}
                  disabled={disabled}
                  onClose={() => setDialogOpen(false)}
                  onPublicChange={setSitePublic}
                />
              )}
              {activeTab === "tracking" && <TrackingTab siteMetadata={currentSiteMetadata} disabled={disabled} />}
              {activeTab === "exclusions" && <ExclusionsTab siteId={siteMetadata.siteId} disabled={disabled} />}
              {activeTab === "integrations" && IS_CLOUD && <IntegrationsTab disabled={disabled} />}
              {activeTab === "script" && (
                <ScriptBuilder
                  siteId={siteMetadata.id ?? String(siteMetadata.siteId)}
                  siteType={currentSiteMetadata.type || "web"}
                  appIdentifier={currentSiteMetadata.domain}
                />
              )}
              {activeTab === "widget-embeds" && (
                <EmbedTab siteMetadata={currentSiteMetadata} embedEnabled={embedEnabled} />
              )}
              {activeTab === "dashboard-embed" && (
                <DashboardEmbedTab siteMetadata={currentSiteMetadata} disabled={disabled} />
              )}
              {activeTab === "import" && <ImportManager siteId={siteMetadata.siteId} disabled={disabled} />}
              {activeTab === "usage" && <UsageTab siteId={siteMetadata.siteId} />}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
