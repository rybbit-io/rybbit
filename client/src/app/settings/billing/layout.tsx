"use client";

import { useExtracted } from "next-intl";
import { authClient } from "../../../lib/auth";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const currentMember = activeOrg?.members?.find(
    (m) => m.userId === session?.user?.id
  );
  const isMember = currentMember?.role === "member";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Billing")}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t("Manage your subscription and billing.")}
        </p>
      </div>

      {isMember ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center text-neutral-500 dark:text-neutral-400">
          {t("You don't have permission to view subscription settings.")}
        </div>
      ) : (
        <div className="mt-6">{children}</div>
      )}
    </div>
  );
}
