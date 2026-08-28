"use client";

import { useExtracted } from "next-intl";
import { useOrganizationAccess } from "../../../hooks/useOrganizationAccess";
import { OrganizationAccessGate } from "../components/OrganizationAccessGate";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const access = useOrganizationAccess();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Billing")}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t("Manage your subscription and billing.")}</p>
      </div>

      <OrganizationAccessGate
        decision={access.decisions.viewSubscriptionSettings}
        deniedMessage={t("You don't have permission to view subscription settings.")}
        errorMessage={t("Failed to load organizations data. Please try again later.")}
        loadingMessage={t("Loading organization...")}
        noOrganizationMessage={t("You need to select an organization to manage your subscription.")}
        onRetry={access.retry}
        retryLabel={t("Try Again")}
      >
        <div className="mt-6">{children}</div>
      </OrganizationAccessGate>
    </div>
  );
}
