"use client";
import {
  AlertTriangle,
  ChartColumnDecreasing,
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
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useGetSite } from "../../../../api/admin/sites";
import { Sidebar as SidebarComponents } from "../../../../components/sidebar/Sidebar";
import { SiteSettings } from "../../../../components/SiteSettings/SiteSettings";
import { authClient } from "../../../../lib/auth";
import { IS_CLOUD } from "../../../../lib/const";
import { useEmbedablePage } from "../../utils";
import { SiteSelector } from "./SiteSelector";

function SidebarContent() {
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
    const route = hasPrivateKey ? (segments[2] || "main") : (segments[1] || "main");
    return route === tabName.toLowerCase();
  };

  return (
    <div className="w-56 bg-neutral-900 border-r border-neutral-850 flex flex-col h-dvh">
      <div className="flex flex-col p-3 border-b border-neutral-800">
        <SiteSelector />
      </div>
      <div className="flex flex-col p-3 pt-1">
        <SidebarComponents.SectionHeader>Web Analytics</SidebarComponents.SectionHeader>
        <SidebarComponents.Item
          label="Main"
          active={isActiveTab("main")}
          href={getTabPath("main")}
          icon={<LayoutDashboard className="w-4 h-4" />}
        />
        {/* <SidebarComponents.Item
          label="Realtime"
          active={isActiveTab("realtime")}
          href={getTabPath("realtime")}
          icon={<Earth className="w-4 h-4" />}
        /> */}
        {/* {!IS_CLOUD && (
          <SidebarComponents.Item
            label="Map"
            active={isActiveTab("map")}
            href={getTabPath("map")}
            icon={<Map className="w-4 h-4" />}
          />
        )} */}
        <SidebarComponents.Item
          label="Globe"
          active={isActiveTab("globe")}
          href={getTabPath("globe")}
          icon={<Globe2 className="w-4 h-4" />}
        />
        {IS_CLOUD && (
          <SidebarComponents.Item
            label="Pages"
            active={isActiveTab("pages")}
            href={getTabPath("pages")}
            icon={<File className="w-4 h-4" />}
          />
        )}
        {IS_CLOUD && (
          <SidebarComponents.Item
            label="Performance"
            active={isActiveTab("performance")}
            href={getTabPath("performance")}
            icon={<Gauge className="w-4 h-4" />}
          />
        )}
        <SidebarComponents.Item
          label="Goals"
          active={isActiveTab("goals")}
          href={getTabPath("goals")}
          icon={<Target className="w-4 h-4" />}
        />
        <SidebarComponents.SectionHeader>Product Analytics</SidebarComponents.SectionHeader>
        <div className="hidden md:block">
          <SidebarComponents.Item
            label="Replay"
            active={isActiveTab("replay")}
            href={getTabPath("replay")}
            icon={<Video className="w-4 h-4" />}
          />
        </div>
        <SidebarComponents.Item
          label="Funnels"
          active={isActiveTab("funnels")}
          href={getTabPath("funnels")}
          icon={<Funnel className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label="Journeys"
          active={isActiveTab("journeys")}
          href={getTabPath("journeys")}
          icon={<Split className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label="Retention"
          active={isActiveTab("retention")}
          href={getTabPath("retention")}
          icon={<ChartColumnDecreasing className="w-4 h-4" />}
        />
        <SidebarComponents.SectionHeader>Behavior</SidebarComponents.SectionHeader>
        <SidebarComponents.Item
          label="Sessions"
          active={isActiveTab("sessions")}
          href={getTabPath("sessions")}
          icon={<Rewind className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label="Users"
          active={isActiveTab("users")}
          href={getTabPath("users")}
          icon={<User className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label="Events"
          active={isActiveTab("events")}
          href={getTabPath("events")}
          icon={<MousePointerClick className="w-4 h-4" />}
        />
        <SidebarComponents.Item
          label="Errors"
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
            <SidebarComponents.SectionHeader>Settings</SidebarComponents.SectionHeader>
            <SiteSettings
              siteId={site?.siteId ?? 0}
              trigger={
                <div className="px-3 py-2 rounded-lg transition-colors w-full text-neutral-200 hover:text-white hover:bg-neutral-800/50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">Site Settings</span>
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
