"use client";
import { Activity, AlertCircle, Plug2, Globe } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "../../../../../components/sidebar/Sidebar";

export function UptimeSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar.Root>
      <Sidebar.Title>Uptime</Sidebar.Title>
      <Sidebar.Items>
        <Sidebar.Item
          label="Monitors"
          active={pathname.startsWith("/uptime/monitors")}
          href={"/uptime/monitors"}
          icon={<Activity className="w-4 h-4" />}
        />
        <Sidebar.Item
          label="Incidents"
          active={pathname.startsWith("/uptime/incidents")}
          href={"/uptime/incidents"}
          icon={<AlertCircle className="w-4 h-4" />}
        />
        <Sidebar.Item
          label="Notifications"
          active={pathname.startsWith("/uptime/notifications")}
          href={"/uptime/notifications"}
          icon={<Plug2 className="w-4 h-4" />}
        />
        <Sidebar.Item
          label="Status Page"
          active={pathname.startsWith("/uptime/status-page")}
          href={"/uptime/status-page"}
          icon={<Globe className="w-4 h-4" />}
        />
      </Sidebar.Items>
    </Sidebar.Root>
  );
}
