"use client";
import {
  AlertTriangle,
  ChartColumnDecreasing,
  Code,
  File,
  Funnel,
  Gauge,
  Globe2,
  LayoutDashboard,
  MousePointerClick,
  Rewind,
  Settings,
  Split,
  Target,
  User,
  Video,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { Sidebar as SidebarComponents } from "../../../../components/sidebar/Sidebar";
import { SiteSettings } from "../../../../components/SiteSettings/SiteSettings";
import { authClient } from "../../../../lib/auth";
import { IS_CLOUD } from "../../../../lib/const";
import { useEmbedablePage } from "../../utils";
import { SiteSelector } from "./SiteSelector";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";

function SidebarContent() {
  const t = useExtracted();
  const { data: subscription, isLoading: isSubscriptionLoading } = useStripeSubscription();
  const session = authClient.useSession();
  const pathname = usePathname();
  const embed = useEmbedablePage();

  const { data: site } = useGetSite(Number(pathname.split("/")[1]));

  // Check which tab is active based on the current path
  const getTabPath = (tabName: string) => {
    const segments = pathname.split("/").filter(Boolean);
    const siteId = segments[0];

    // Check if second segment is a private key (12 hex chars)
    const hasPrivateKey = segments.length > 1 && /^[a-f0-9]{12}$/i.test(segments[1]);
    const privateKey = hasPrivateKey ? segments[1] : null;

    // Build path: /siteId/[privateKey]/tabName
    const basePath = privateKey
      ? `/${siteId}/${privateKey}/${tabName.toLowerCase()}`
      : `/${siteId}/${tabName.toLowerCase()}`;

    return `${basePath}${embed ? "?embed=true" : ""}`;
  };

  const isActiveTab = (tabName: string) => {
    if (!pathname.includes("/")) return false;

    const segments = pathname.split("/").filter(Boolean);
    // Check if we have a private key (second segment is 12 hex chars)
    const hasPrivateKey = segments.length > 1 && /^[a-f0-9]{12}$/i.test(segments[1]);

    // Route is either segments[1] (no key) or segments[2] (with key)
    const route = hasPrivateKey ? segments[2] || "main" : segments[1] || "main";
    return route === tabName.toLowerCase();
  };

  return (
    <div className="w-56 bg-neutral-50 border-r border-neutral-150 dark:bg-neutral-900 dark:border-neutral-850 flex flex-col h-dvh">
      <div className="flex flex-col p-3 border-b border-neutral-200 dark:border-neutral-800">
        <SiteSelector />
      </div>
      <div className="flex flex-col p-3 pt-1">
        <SidebarComponents.SectionHeader>{t("Web Analytics")}</SidebarComponents.SectionHeader>
        <SidebarComponents.Item
          label={t("Main")}
          active={isActiveTab("main")}
          href={getTabPath("main")}
          icon={<LayoutDashboard className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label={t("Globe")}
          active={isActiveTab("globe")}
          href={getTabPath("globe")}
          icon={<Globe2 className="w-4 h-4" />}
        />
        {IS_CLOUD && (
          <SidebarComponents.Item
            label={t("Pages")}
            active={isActiveTab("pages")}
            href={getTabPath("pages")}
            icon={<File className="w-4 h-4" />}
          />
        )}
        {IS_CLOUD && (
          <SidebarComponents.Item
            label={t("Performance")}
            active={isActiveTab("performance")}
            href={getTabPath("performance")}
            icon={<Gauge className="w-4 h-4" />}
          />
        )}
        <SidebarComponents.Item
          label={t("Goals")}
          active={isActiveTab("goals")}
          href={getTabPath("goals")}
          icon={<Target className="w-4 h-4" />}
        />
        <div className="hidden md:block">
          <SidebarComponents.Item
            label={t("API Playground")}
            active={isActiveTab("api-playground")}
            href={getTabPath("api-playground")}
            icon={<Code className="w-4 h-4" />}
          />
        </div>
        <SidebarComponents.SectionHeader>{t("Product Analytics")}</SidebarComponents.SectionHeader>
        <div className="hidden md:block">
          {!subscription?.planName?.startsWith("appsumo") && !isSubscriptionLoading && (
            <SidebarComponents.Item
              label={t("Replay")}
              active={isActiveTab("replay")}
              href={getTabPath("replay")}
              icon={<Video className="w-4 h-4" />}
            />
          )}
        </div>
        <SidebarComponents.Item
          label={t("Funnels")}
          active={isActiveTab("funnels")}
          href={getTabPath("funnels")}
          icon={<Funnel className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label={t("Journeys")}
          active={isActiveTab("journeys")}
          href={getTabPath("journeys")}
          icon={<Split className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label={t("Retention")}
          active={isActiveTab("retention")}
          href={getTabPath("retention")}
          icon={<ChartColumnDecreasing className="w-4 h-4" />}
        />
        <SidebarComponents.SectionHeader>{t("Behavior")}</SidebarComponents.SectionHeader>
        <SidebarComponents.Item
          label={t("Sessions")}
          active={isActiveTab("sessions")}
          href={getTabPath("sessions")}
          icon={<Rewind className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label={t("Users")}
          active={isActiveTab("users")}
          href={getTabPath("users")}
          icon={<User className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label={t("Events")}
          active={isActiveTab("events")}
          href={getTabPath("events")}
          icon={<MousePointerClick className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label={t("Errors")}
          active={isActiveTab("errors")}
          href={getTabPath("errors")}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        {/* <SidebarComponents.Item
          label="Reports"
          active={isActiveTab("reports")}
          href={getTabPath("reports")}
          icon={<ChartBarDecreasing className="w-4 h-4" />}
          /> */}
        {session.data && !embed && (
          <>
            <SidebarComponents.SectionHeader>{t("Settings")}</SidebarComponents.SectionHeader>
            <SiteSettings
              siteId={site?.siteId ?? 0}
              trigger={
                <div className="px-3 py-2 rounded-lg transition-colors w-full text-neutral-700 hover:text-neutral-900 hover:bg-neutral-150 dark:text-neutral-200 dark:hover:text-white dark:hover:bg-neutral-800/50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">{t("Site Settings")}</span>
                  </div>
                </div>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarContent />
    </Suspense>
  );
}
