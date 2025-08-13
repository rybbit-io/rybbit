"use client";
import { Building2, CreditCard, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "../../../components/sidebar/Sidebar";

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar.Root>
      <Sidebar.Title>Settings</Sidebar.Title>
      <Sidebar.Items>
        <Sidebar.Item
          label="Account"
          active={pathname.startsWith("/settings/account")}
          href={"/settings/account"}
          icon={<UserCircle className="w-4 h-4" />}
        />
        <Sidebar.Item
          label="Organization"
          active={pathname.startsWith("/settings/organization/members")}
          href={"/settings/organization"}
          icon={<Building2 className="w-4 h-4" />}
        />
        <Sidebar.Item
          label="Subscription"
          active={pathname.startsWith("/settings/organization/subscription")}
          href={"/settings/organization/subscription"}
          icon={<CreditCard className="w-4 h-4" />}
        />
      </Sidebar.Items>
    </Sidebar.Root>
  );
}
