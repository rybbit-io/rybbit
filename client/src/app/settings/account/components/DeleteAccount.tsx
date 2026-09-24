"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../components/ui/alert-dialog";
import { Button } from "../../../../components/ui/button";
import { authClient } from "../../../../lib/auth";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";

export function DeleteAccount() {
  const { data: subscription } = useStripeSubscription();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const t = useExtracted();

  const handleAccountDeletion = async () => {
    try {
      setIsDeleting(true);
      const response = await authClient.deleteUser();

      if (response.error) {
        toast.error(t("Failed to delete account: {error}", { error: response.error.message || t("Unknown error") }));
        return;
      }
      queryClient.clear();
      toast.success(t("Account successfully deleted"));
      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error(t("Failed to delete account: {error}", { error: String(error) }));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const accountNotDeletable =
    isDeleting || subscription?.planName.startsWith("standard") || subscription?.planName.startsWith("pro");

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full" onClick={() => setIsOpen(true)}>
          {t("Delete Account")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" color="hsl(var(--red-500))" />
            {accountNotDeletable ? t("Cannot delete account") : t("Delete your account?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {accountNotDeletable
              ? t("You have an active subscription. Please cancel your subscription before deleting your account.")
              : t("This action cannot be undone. This will permanently delete your account and remove all your data from our servers.")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
            {t("Cancel")}
          </AlertDialogCancel>
          {!accountNotDeletable && (
            <AlertDialogAction
              onClick={e => {
                e.preventDefault();
                handleAccountDeletion();
              }}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? t("Deleting...") : t("Delete Account")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
