"use client";

import { useExtracted } from "next-intl";
import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { UserInfo } from "@/api/analytics/endpoints";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSitePermissions } from "@/hooks/usePermissions";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { IdentifyUserDialog } from "./IdentifyUserDialog";

interface UserActionsProps {
  userId: string;
  data: UserInfo;
}

export function UserActions({ userId, data }: UserActionsProps) {
  const t = useExtracted();
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { can } = useSitePermissions();

  const isIdentified = !!data.identified_user_id;
  const canWriteUsers = can("users:write");
  const canDelete = can("users:delete");

  return (
    <div className="flex items-center gap-1">
      {canWriteUsers && !isIdentified && (
        <Button size="sm" onClick={() => setIdentifyOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          {t("Identify User")}
        </Button>
      )}
      {canDelete && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="smIcon"
                aria-label={t("Delete User")}
                className="text-neutral-500 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("Delete User")}</TooltipContent>
          </Tooltip>
          <DeleteUserDialog userId={userId} open={deleteOpen} onOpenChange={setDeleteOpen} />
        </>
      )}
      {canWriteUsers && (
        <IdentifyUserDialog anonymousId={data.user_id || userId} open={identifyOpen} onOpenChange={setIdentifyOpen} />
      )}
    </div>
  );
}
