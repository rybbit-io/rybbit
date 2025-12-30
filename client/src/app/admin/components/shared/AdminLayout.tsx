"use client";

import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { useAdminPermission } from "../../hooks/useAdminPermission";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isCheckingAdmin } = useAdminPermission();

  // If not admin, show access denied
  if (!isAdmin && !isCheckingAdmin) {
    redirect("/");
  }

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-400"></div>
      </div>
    );
  }

  return <div>{children}</div>;
}
