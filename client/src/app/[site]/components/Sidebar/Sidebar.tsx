"use client";
import { Funnel } from "@phosphor-icons/react/dist/ssr";
import {
  BrainCircuit,
  ChartBarDecreasing,
  Earth,
  LayoutDashboard,
  LayoutGrid,
  Rewind,
  Settings,
  User,
  Map,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGetSite } from "../../../../api/admin/sites";
import { SiteSettings } from "../../../../components/SiteSettings/SiteSettings";
import { authClient } from "../../../../lib/auth";
import LiveUserCount from "./LiveUserCount";
import { SiteSelector } from "./SiteSelector";

export function Sidebar() {
  const session = authClient.useSession();
  const pathname = usePathname();

  const { data: site } = useGetSite(Number(pathname.split("/")[1]));

  // Check which tab is active based on the current path
  const getTabPath = (tabName: string) => {
    return `/${pathname.split("/")[1]}/${tabName.toLowerCase()}`;
  };

  const isActiveTab = (tabName: string) => {
    if (!pathname.includes("/")) return false;

    const route = pathname.split("/")[2] || "main";
    return route === tabName.toLowerCase();
  };

  return (
    <div className="w-56 bg-neutral-900 border-r border-neutral-800 h-full flex-col">
      {site && (
        <div className="p-3 border-b  border-neutral-800 flex flex-col gap-2">
          <SiteSelector />
        </div>
      )}
      <div className="flex flex-col space-y-1 p-3 ">
        <LiveUserCount />
        <SidebarLink
          label="Main"
          active={isActiveTab("main")}
          href={getTabPath("main")}
          icon={<LayoutDashboard className="w-4 h-4" />}
        />
        <SidebarLink
          label="Sessions"
          active={isActiveTab("sessions")}
          href={getTabPath("sessions")}
          icon={<Rewind className="w-4 h-4" />}
        />
        <SidebarLink
          label="Users"
          active={isActiveTab("users")}
          href={getTabPath("users")}
          icon={<User className="w-4 h-4" />}
        />
        <SidebarLink
          label="Realtime"
          active={isActiveTab("realtime")}
          href={getTabPath("realtime")}
          icon={<Earth className="w-4 h-4" />}
        />
        {/* <SidebarLink
          label="Map"
          active={isActiveTab("map")}
          href={getTabPath("map")}
          icon={<Map className="w-4 h-4" />}
        /> */}
        <SidebarLink
          label="Retention"
          active={isActiveTab("retention")}
          href={getTabPath("retention")}
          icon={<LayoutGrid className="w-4 h-4" />}
        />
        <SidebarLink
          label="Funnels"
          active={isActiveTab("funnels")}
          href={getTabPath("funnels")}
          icon={<Funnel weight="bold" />}
        />
        <SidebarLink
          label="Reports"
          active={isActiveTab("reports")}
          href={getTabPath("reports")}
          icon={<ChartBarDecreasing className="w-4 h-4" />}
        />
        <SidebarLink
          label="AI"
          active={isActiveTab("ai")}
          href={getTabPath("ai")}
          icon={<BrainCircuit className="w-4 h-4" />}
        />
        {session.data && (
          <SiteSettings
            siteId={site?.siteId ?? 0}
            trigger={
              <div className="px-3 py-2 rounded-lg transition-colors w-full text-neutral-200 hover:text-white hover:bg-neutral-800/50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </div>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

// Sidebar Link component
function SidebarLink({
  label,
  active = false,
  href,
  icon,
}: {
  label: string;
  active?: boolean;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} className="focus:outline-none">
      <div
        className={`px-3 py-2 rounded-lg transition-colors w-full ${
          active
            ? "bg-neutral-800 text-white"
            : "text-neutral-200 hover:text-white hover:bg-neutral-800/50"
        }`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
      </div>
    </Link>
  );
}
