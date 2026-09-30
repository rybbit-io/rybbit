"use client";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useOrganizationInvitations } from "../../../../api/admin/hooks/useOrganizations";
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
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { authClient } from "../../../../lib/auth";
import { useRoleInfo } from "../../../../lib/roles";

interface InvitationsProps {
  organizationId: string;
  /** Cancel pending invitations (members:manage). */
  canManage: boolean;
}

function CancelInvitationButton({
  invitation,
  onCancelled,
}: {
  invitation: { id: string; email: string };
  onCancelled: () => void;
}) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      // better-auth reports failures in the result rather than throwing.
      const { error } = await authClient.organization.cancelInvitation({
        invitationId: invitation.id,
      });
      if (error) {
        throw new Error(error.message || t("Failed to cancel invitation"));
      }
      toast.success(t("Invitation cancelled"));
      setOpen(false);
      onCancelled();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("Failed to cancel invitation"));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (!isCancelling) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          aria-label={t("Cancel invitation for {email}", { email: invitation.email })}
        >
          {t("Cancel")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Cancel this invitation?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("The invitation sent to {email} will stop working. You can invite them again later.", {
              email: invitation.email,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>{t("Keep invitation")}</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction, so the dialog stays open until the request settles
              (handleCancel closes it on success). `loading` keeps its width while pending. */}
          <Button variant="destructive" loading={isCancelling} loadingLabel={t("Cancelling...")} onClick={handleCancel}>
            {t("Cancel invitation")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Invitations({ organizationId, canManage }: InvitationsProps) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();

  const {
    data: invitations,
    refetch: refetchInvitations,
    isLoading: invitationsLoading,
  } = useOrganizationInvitations(organizationId);
  const pendingInvitations = invitations?.filter(invitation => invitation.status === "pending") ?? [];

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{t("Invitations")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Email")}</TableHead>
              <TableHead>{t("Role")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Expires")}</TableHead>
              {canManage && <TableHead className="w-12">{t("Actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitationsLoading ? (
              // Loading skeleton rows
              Array.from({ length: 2 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell>
                    <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-6 bg-muted animate-pulse rounded w-20"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="h-8 bg-muted animate-pulse rounded w-16 ml-auto"></div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <>
                {pendingInvitations.length > 0 ? (
                  pendingInvitations.map(invitation => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell className="capitalize">{roleInfo(invitation.role).label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t("Pending")}</Badge>
                      </TableCell>
                      <TableCell>
                        {DateTime.fromJSDate(new Date(invitation.expiresAt)).toLocaleString(DateTime.DATE_SHORT)}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          {invitation.status === "pending" && (
                            <CancelInvitationButton invitation={invitation} onCancelled={refetchInvitations} />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center py-6 text-muted-foreground">
                      {t("No pending invitations")}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
