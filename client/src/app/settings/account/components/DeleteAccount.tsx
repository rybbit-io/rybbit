"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { HoldToConfirm } from "@/components/interior/hold-to-confirm";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
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
    setIsDeleting(true);
    try {
      const response = await authClient.deleteUser();

      if (response.error) {
        toast.error(t("Failed to delete account: {error}", { error: response.error.message || t("Unknown error") }));
        setIsDeleting(false);
        return;
      }
    } catch (error) {
      toast.error(t("Failed to delete account: {error}", { error: String(error) }));
      setIsDeleting(false);
      return;
    }
    // Stays pending through the reload, so the button doesn't re-arm on the way out.
    queryClient.clear();
    toast.success(t("Account successfully deleted"));
    setIsOpen(false);
    window.location.reload();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Paid plans must be cancelled first. (isDeleting used to be part of this, which flipped the dialog to
  // "Cannot delete account" for as long as the deletion was running.)
  const hasActiveSubscription =
    subscription?.planName.startsWith("standard") || subscription?.planName.startsWith("pro");

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={open => {
        if (!isDeleting) setIsOpen(open);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full" onClick={() => setIsOpen(true)}>
          {t("Delete Account")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" color="hsl(var(--red-500))" />
            {hasActiveSubscription ? t("Cannot delete account") : t("Delete your account?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasActiveSubscription
              ? t("You have an active subscription. Please cancel your subscription before deleting your account.")
              : t(
                  "This action cannot be undone. This will permanently delete your account and remove all your data from our servers."
                )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
            {t("Cancel")}
          </AlertDialogCancel>
          {!hasActiveSubscription && (
            <HoldToConfirm onConfirm={handleAccountDeletion} pending={isDeleting} pendingLabel={t("Deleting...")}>
              {t("Hold to delete account")}
            </HoldToConfirm>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
