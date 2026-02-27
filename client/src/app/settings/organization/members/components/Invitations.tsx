"use client";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useOrganizationInvitations } from "../../../../../api/admin/hooks/useOrganizations";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../components/ui/table";
import { authClient } from "../../../../../lib/auth";

interface InvitationsProps {
  organizationId: string;
  isOwner: boolean;
}

export function Invitations({ organizationId, isOwner }: InvitationsProps) {
  const t = useExtracted();
  const [loadingInvitationId, setLoadingInvitationId] = useState<string | null>(null);

  const {
    data: invitations,
    refetch: refetchInvitations,
    isLoading: invitationsLoading,
  } = useOrganizationInvitations(organizationId);

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      setLoadingInvitationId(invitationId);
      await authClient.organization.cancelInvitation({
        invitationId,
      });
      toast.success(t("Invitation cancelled"));
      refetchInvitations();
    } catch (error: any) {
      toast.error(error.message || t("Failed to cancel invitation"));
    } finally {
      setLoadingInvitationId(null);
    }
  };

  const handleResendInvitation = async (invitation: any) => {
    try {
      setLoadingInvitationId(invitation.id);
      await authClient.organization.inviteMember({
        email: invitation.email,
        role: invitation.role,
        organizationId,
        resend: true,
      });
      toast.success(t("Invitation resent to {email}", { email: invitation.email }));
      refetchInvitations();
    } catch (error: any) {
      toast.error(error.message || t("Failed to resend invitation"));
    } finally {
      setLoadingInvitationId(null);
    }
  };

  // Helper function to determine badge variant
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "accepted":
        return "success";
      case "rejected":
        return "destructive";
      case "canceled":
        return "warning";
      default:
        return "outline";
    }
  };

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
              {isOwner && <TableHead className="w-12">{t("Actions")}</TableHead>}
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
                  {isOwner && (
                    <TableCell>
                      <div className="h-8 bg-muted animate-pulse rounded w-16 ml-auto"></div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <>
                {invitations?.length && invitations.length > 0 ? (
                  invitations.map(invitation => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell className="capitalize">
                        {invitation.role === "admin" ? t("Admin") : invitation.role === "owner" ? t("Owner") : t("Member")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(invitation.status)}>
                          {invitation.status === "pending"
                            ? t("Pending")
                            : invitation.status === "accepted"
                              ? t("Accepted")
                              : invitation.status === "rejected"
                                ? t("Rejected")
                                : invitation.status === "canceled"
                                  ? t("Canceled")
                                  : invitation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {DateTime.fromJSDate(new Date(invitation.expiresAt)).toLocaleString(DateTime.DATE_SHORT)}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-right">
                          {invitation.status === "pending" && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={loadingInvitationId === invitation.id}
                              onClick={() => handleCancelInvitation(invitation.id)}
                            >
                              {loadingInvitationId === invitation.id ? t("Processing...") : t("Cancel")}
                            </Button>
                          )}
                          {invitation.status === "canceled" && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={loadingInvitationId === invitation.id}
                              onClick={() => handleResendInvitation(invitation)}
                            >
                              {loadingInvitationId === invitation.id ? t("Processing...") : t("Resend")}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 5 : 4} className="text-center py-6 text-muted-foreground">
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
