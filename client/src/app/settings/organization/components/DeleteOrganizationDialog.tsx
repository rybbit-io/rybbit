"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useId, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { USER_ORGANIZATIONS_QUERY_KEY } from "../../../../api/admin/hooks/useOrganizations";
import { Organization } from "../page";

interface DeleteOrganizationDialogProps {
  organization: Organization;
  onSuccess: () => void;
}

export function DeleteOrganizationDialog({ organization, onSuccess }: DeleteOrganizationDialogProps) {
  const { data: subscription } = useStripeSubscription();
  const t = useExtracted();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();
  const confirmPromptId = useId();

  const hasActiveSubscription =
    subscription?.planName.startsWith("standard") || subscription?.planName.startsWith("pro");

  const handleDelete = async () => {
    if (confirmText !== organization.name) {
      toast.error(t("Please type the organization name to confirm deletion"));
      return;
    }

    setIsDeleting(true);
    try {
      // better-auth reports failures in the result rather than throwing.
      const { error } = await authClient.organization.delete({
        organizationId: organization.id,
      });
      if (error) {
        throw new Error(error.message || t("Failed to delete organization"));
      }
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("Failed to delete organization"));
      setIsDeleting(false);
      return;
    }

    // Stays pending on success: the page leaves this organization (it's keyed by organization id), so the
    // button must not re-arm while the dialog closes.
    toast.success(t("Organization deleted successfully"));
    queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
    authClient.organization.setActive({
      organizationId: null,
    });
    setIsOpen(false);
    onSuccess();
  };

  const handleOpenChange = (open: boolean) => {
    // A running deletion can't be dismissed.
    if (isDeleting && !open) return;
    // Every attempt starts from an empty confirmation field.
    if (open) setConfirmText("");
    setIsOpen(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          {t("Delete Organization")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" color="hsl(var(--red-500))" />
            {hasActiveSubscription ? t("Cannot delete organization") : t("Delete your organization?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasActiveSubscription
              ? t("You have an active subscription. Please cancel your subscription before deleting your organization.")
              : t(
                  "This action cannot be undone. This will permanently delete the organization and remove all associated data."
                )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!hasActiveSubscription && (
          <div className="py-4">
            <p id={confirmPromptId} className="text-sm mb-2">
              {t("Please type {name} to confirm.", { name: organization.name })}
            </p>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={organization.name}
              aria-labelledby={confirmPromptId}
              autoComplete="off"
              disabled={isDeleting}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t("Cancel")}</AlertDialogCancel>
          {!hasActiveSubscription && (
            <HoldToConfirm
              onConfirm={handleDelete}
              pending={isDeleting}
              pendingLabel={t("Deleting...")}
              disabled={confirmText !== organization.name}
            >
              {t("Hold to delete organization")}
            </HoldToConfirm>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
