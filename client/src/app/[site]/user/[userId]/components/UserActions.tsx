"use client";

import { useExtracted } from "next-intl";
import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { UserInfo } from "@/api/analytics/endpoints";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

  const isIdentified = !!data.identified_user_id;

  return (
    <div className="flex items-center gap-1">
      {!isIdentified && (
        <Button size="sm" onClick={() => setIdentifyOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          {t("Identify User")}
        </Button>
      )}
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

      <IdentifyUserDialog anonymousId={data.user_id || userId} open={identifyOpen} onOpenChange={setIdentifyOpen} />
      <DeleteUserDialog userId={userId} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
