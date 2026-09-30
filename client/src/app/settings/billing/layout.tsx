"use client";

import { useExtracted } from "next-intl";
import { OrgPermissionGate } from "../components/OrgPermissionGate";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Billing")}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t("Manage your subscription and billing.")}
        </p>
      </div>

      <OrgPermissionGate
        permission="billing:manage"
        deniedMessage={t("You don't have permission to view subscription settings.")}
      >
        <div className="mt-6">{children}</div>
      </OrgPermissionGate>
    </div>
  );
}
