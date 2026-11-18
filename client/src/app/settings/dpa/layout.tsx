"use client";

import { useExtracted } from "next-intl";
import { useActiveOrgName } from "../../../hooks/useActiveOrgName";
import { OrgPermissionGate } from "../components/OrgPermissionGate";
import { SettingsPage, SettingsPageHeader } from "../components/Ledger";

export default function DpaLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const orgName = useActiveOrgName();

  return (
    <SettingsPage>
      <SettingsPageHeader
        title={t("Data processing agreement")}
        description={
          orgName
            ? t("Sign Rybbit's DPA for {name}. It comes countersigned by us, on every plan.", { name: orgName })
            : undefined
        }
      />
      <OrgPermissionGate
        permission="dpa:manage"
        deniedMessage={t("Only organization admins can sign or download the DPA.")}
      >
        {children}
      </OrgPermissionGate>
    </SettingsPage>
  );
}
