"use client";

import { useExtracted } from "next-intl";
import { OrgPermissionGate } from "../components/OrgPermissionGate";
import { SettingsPage, SettingsPageHeader } from "../components/Ledger";
import { useActiveOrgName } from "../../../hooks/useActiveOrgName";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const orgName = useActiveOrgName();

  return (
    <SettingsPage>
      <SettingsPageHeader
        title={t("Billing")}
        description={orgName ? t("Plan, usage and invoices for {name}.", { name: orgName }) : undefined}
      />
      <OrgPermissionGate
        permission="billing:manage"
        deniedMessage={t("You don't have permission to view subscription settings.")}
      >
        {children}
      </OrgPermissionGate>
    </SettingsPage>
  );
}
