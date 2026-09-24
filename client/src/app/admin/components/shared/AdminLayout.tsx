"use client";

import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { useExtracted } from "next-intl";
import { useAdminPermission } from "../../hooks/useAdminPermission";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isCheckingAdmin } = useAdminPermission();
  const t = useExtracted();

  if (!isAdmin && !isCheckingAdmin) {
    redirect("/");
  }

  if (isCheckingAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent dark:border-neutral-600 dark:border-t-transparent" />
          {t("Checking access...")}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
