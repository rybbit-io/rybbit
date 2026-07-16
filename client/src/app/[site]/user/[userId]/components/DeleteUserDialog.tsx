"use client";

import { useExtracted } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";

import { useDeleteUser } from "@/api/analytics/hooks/useDeleteUser";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteUserDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({ userId, open, onOpenChange }: DeleteUserDialogProps) {
  const t = useExtracted();
  const { site } = useParams();
  const router = useRouter();
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync({ userId });
      toast.success(t("User deleted"));
      onOpenChange(false);
      router.push(`/${site}/users`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to delete user"));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Delete User")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "This permanently deletes all analytics data for this user, including events, sessions, session replays, and traits across all linked devices. This action cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={e => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending ? t("Deleting...") : t("Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
