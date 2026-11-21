"use client";

import type { Permission } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import { useOrgPermissions } from "../../../hooks/usePermissions";
import { authClient } from "../../../lib/auth";

/**
 * Shows a settings section only to users whose role in the active organization
 * holds `permission`. It waits for the session and the organization list rather
 * than flashing the denial, and leaves "no organization" to the page itself.
 */
export function OrgPermissionGate({
  permission,
  deniedMessage,
  children,
}: {
  permission: Permission;
  deniedMessage: string;
  children: React.ReactNode;
}) {
  const t = useExtracted();
  const { data: session } = authClient.useSession();
  const { can, isLoading } = useOrgPermissions();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse">{t("Loading organization...")}</div>
      </div>
    );
  }

  if (session?.session.activeOrganizationId && !can(permission)) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center text-neutral-500 dark:text-neutral-400">
        {deniedMessage}
      </div>
    );
  }

  return <>{children}</>;
}
