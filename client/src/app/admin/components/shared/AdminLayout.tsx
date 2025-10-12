"use client";

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAdminPermission } from "../../hooks/useAdminPermission";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  showStopImpersonating?: boolean;
}

export function AdminLayout({ children, title, showStopImpersonating = false }: AdminLayoutProps) {
  const { isAdmin, isImpersonating, isCheckingAdmin, stopImpersonating } = useAdminPermission();

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{title}</h2>
        {showStopImpersonating && isImpersonating && (
          <Button onClick={stopImpersonating} variant="destructive">
            Stop Impersonating
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
