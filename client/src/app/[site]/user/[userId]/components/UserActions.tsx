"use client";

import { useExtracted } from "next-intl";
import { MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { UserInfo } from "@/api/analytics/endpoints";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <Button variant="accent" size="sm" onClick={() => setIdentifyOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          {t("Identify User")}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger variant="outline" size="smIcon" aria-label={t("More user actions")}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/50 dark:focus:text-red-300"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 />
            {t("Delete User")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <IdentifyUserDialog anonymousId={data.user_id || userId} open={identifyOpen} onOpenChange={setIdentifyOpen} />
      <DeleteUserDialog userId={userId} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
