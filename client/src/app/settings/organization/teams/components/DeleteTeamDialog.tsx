"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

import { Team } from "@/api/admin/endpoints/teams";
import { useDeleteTeam } from "@/api/admin/hooks/useTeams";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth";
import { Trash2 } from "lucide-react";

interface DeleteTeamDialogProps {
  team: Team;
  onSuccess?: () => void;
}

export function DeleteTeamDialog({ team, onSuccess }: DeleteTeamDialogProps) {
  const t = useExtracted();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const deleteTeam = useDeleteTeam();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    if (!activeOrganization?.id) return;

    try {
      await deleteTeam.mutateAsync({
        organizationId: activeOrganization.id,
        teamId: team.id,
      });
      toast.success(t("Team deleted successfully"));
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("Failed to delete team")
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="smIcon">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Delete Team")}</DialogTitle>
          <DialogDescription>
            {t(
              "Are you sure you want to delete the team \"{name}\"? Sites assigned to this team will become unassigned and visible to all members.",
              { name: team.name }
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTeam.isPending}
          >
            {deleteTeam.isPending ? t("Deleting...") : t("Delete Team")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
