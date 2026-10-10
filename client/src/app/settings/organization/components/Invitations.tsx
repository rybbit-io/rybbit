"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";

import type { useOrganizationInvitations } from "@/api/admin/hooks/useOrganizations";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { authClient } from "@/lib/auth";
import { useRoleInfo } from "@/lib/roles";
import { getTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";

import { InvitationAvatar } from "../../components/PersonAvatar";
import { PEOPLE_CELL, PEOPLE_CHIP, PEOPLE_ROW, PEOPLE_SECONDARY, PersonCell, SiteAccessSummary } from "./PeopleCells";
import type { PersonAccess } from "./personAccess";

export type Invitation = NonNullable<ReturnType<typeof useOrganizationInvitations>["data"]>[number];

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
          variant="ghost"
          size="xs"
          className="-mr-1.5"
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

function ResendInvitationButton({ invitation, onResent }: { invitation: Invitation; onResent: () => void }) {
  const t = useExtracted();
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      // better-auth only finds unexpired invitations to resend; for an expired one it creates a new
      // invitation from the fields sent here. So send every field the original carries, and retire the
      // expired row once its replacement exists. It reports failures in the result rather than throwing.
      const isExpired = new Date(invitation.expiresAt) < new Date();
      const teamIds = invitation.teamId?.split(",").filter(Boolean) ?? [];
      const hasRestrictedSiteAccess = invitation.hasRestrictedSiteAccess ?? false;
      const { error } = await authClient.organization.inviteMember({
        email: invitation.email,
        // better-auth's client types only know its default roles; the server's access control defines ours.
        role: invitation.role as "owner" | "admin" | "member",
        organizationId: invitation.organizationId,
        hasRestrictedSiteAccess,
        siteIds: invitation.siteIds ?? [],
        ...(hasRestrictedSiteAccess && invitation.siteRole ? { siteRole: invitation.siteRole } : {}),
        ...(teamIds.length > 0 ? { teamId: teamIds.length === 1 ? teamIds[0] : teamIds } : {}),
        resend: true,
      });
      if (error) {
        throw new Error(error.message || t("Failed to resend invitation"));
      }
      if (isExpired) {
        await authClient.organization.cancelInvitation({ invitationId: invitation.id });
      }
      toast.success(t("Invitation sent to {email}", { email: invitation.email }));
      onResent();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("Failed to resend invitation"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="xs"
      loading={isResending}
      loadingLabel={t("Resending...")}
      aria-label={t("Resend invitation to {email}", { email: invitation.email })}
      onClick={handleResend}
    >
      {t("Resend")}
    </Button>
  );
}

interface InvitationRowProps {
  invitation: Invitation;
  /** Who sent it, while they're still a member. */
  inviterName?: string;
  /** The sites they'll reach once they join; undefined while loading, null when unavailable. */
  access: PersonAccess | null | undefined;
  /** Show the actions column and allow cancelling (members:manage). */
  canManage: boolean;
  /** Allow emailing it again. */
  canResend: boolean;
  /** After a cancel or resend, so the list can be fetched again. */
  onChanged: () => void;
}

/** A pending invitation, as a row of the people table. */
export function InvitationRow({
  invitation,
  inviterName,
  access,
  canManage,
  canResend,
  onChanged,
}: InvitationRowProps) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();

  const expiresAt = DateTime.fromJSDate(new Date(invitation.expiresAt)).setZone(getTimezone());
  const expiry = expiresAt.toLocaleString({ month: "short", day: "numeric" });

  return (
    <TableRow className={PEOPLE_ROW}>
      <TableCell className={PEOPLE_CELL}>
        <PersonCell
          avatar={<InvitationAvatar />}
          name={invitation.email}
          marker={
            <Badge variant="outline" className={PEOPLE_CHIP}>
              {t("Pending")}
            </Badge>
          }
          detail={inviterName ? t("Invited by {name}", { name: inviterName }) : undefined}
        />
      </TableCell>
      <TableCell className={cn(PEOPLE_CELL, PEOPLE_SECONDARY)}>{roleInfo(invitation.role).label}</TableCell>
      <TableCell className={cn(PEOPLE_CELL, PEOPLE_SECONDARY)}>
        <SiteAccessSummary access={access} />
      </TableCell>
      <TableCell className={cn(PEOPLE_CELL, "whitespace-nowrap tabular-nums text-neutral-500 dark:text-neutral-400")}>
        {expiresAt < DateTime.now() ? t("Expired {date}", { date: expiry }) : t("Expires {date}", { date: expiry })}
      </TableCell>
      {canManage && (
        <TableCell className={cn(PEOPLE_CELL, "text-right")}>
          <div className="inline-flex items-center justify-end gap-1">
            {canResend && <ResendInvitationButton invitation={invitation} onResent={onChanged} />}
            <CancelInvitationButton invitation={invitation} onCancelled={onChanged} />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
