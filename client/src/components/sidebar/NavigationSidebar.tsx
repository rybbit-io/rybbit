"use client";
import { AppWindow, Building2, Combine, CreditCard, UserCircle, Users } from "lucide-react";
import { useExtracted } from "next-intl";
import { usePathname } from "next/navigation";
import { useOrganizationAccess } from "../../hooks/useOrganizationAccess";
import { IS_CLOUD } from "../../lib/const";
import { OrganizationSelector } from "../OrganizationSelector";
import { Sidebar } from "./Sidebar";

export function NavigationSidebar() {
  const t = useExtracted();
  const pathname = usePathname();
  const access = useOrganizationAccess();

  return (
    <Sidebar.Root>
      <div className="p-3 pt-4 border-b border-neutral-300 dark:border-neutral-800">
        <OrganizationSelector />
      </div>
      <Sidebar.Items>
        <Sidebar.Item
          label={t("Properties")}
          active={pathname === "/"}
          href="/"
          icon={<AppWindow className="w-4 h-4" />}
        />
        <Sidebar.Item
          label={t("Rollup")}
          active={pathname.startsWith("/rollup")}
          href="/rollup"
          icon={<Combine className="w-4 h-4" />}
        />
        <Sidebar.Item
          label={t("Account")}
          active={pathname.startsWith("/settings/account")}
          href="/settings/account"
          icon={<UserCircle className="w-4 h-4" />}
        />
        {access.decisions.manageOrganizationSettings.allowed && (
          <Sidebar.Item
            label={t("Organization")}
            active={pathname === "/settings/organization"}
            href="/settings/organization"
            icon={<Building2 className="w-4 h-4" />}
          />
        )}
        {access.decisions.manageTeams.allowed && (
          <Sidebar.Item
            label={t("Teams")}
            active={pathname.startsWith("/settings/teams")}
            href="/settings/teams"
            icon={<Users className="w-4 h-4" />}
          />
        )}
        {IS_CLOUD && access.decisions.viewSubscriptionSettings.allowed && (
          <Sidebar.Item
            label={t("Billing")}
            active={pathname.startsWith("/settings/billing")}
            href="/settings/billing"
            icon={<CreditCard className="w-4 h-4" />}
          />
        )}
      </Sidebar.Items>
    </Sidebar.Root>
  );
}
