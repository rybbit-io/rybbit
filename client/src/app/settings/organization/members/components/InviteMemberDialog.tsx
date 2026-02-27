"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";

import { authedFetch } from "@/api/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/const";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";

import { SiteAccessMultiSelect } from "./SiteAccessMultiSelect";

interface InviteMemberDialogProps {
  organizationId: string;
  onSuccess: () => void;
  memberCount: number;
}

export function InviteMemberDialog({ organizationId, onSuccess, memberCount }: InviteMemberDialogProps) {
  const { data: subscription } = useStripeSubscription();
  const queryClient = useQueryClient();
  const t = useExtracted();

  const memberLimit = subscription?.memberLimit ?? null;
  const isOverMemberLimit = useMemo(() => {
    if (!IS_CLOUD) return false;
    if (memberLimit === null) return false;
    return memberCount >= memberLimit;
  }, [memberLimit, memberCount]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "owner">("member");
  const [restrictSiteAccess, setRestrictSiteAccess] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const inviteMutation = useMutation({
    mutationFn: async () => {
      // Create the invitation via BetterAuth
      const result = await authClient.organization.inviteMember({
        email,
        role,
        organizationId,
        resend: true,
      });

      // If role is "member" and site access is restricted, update the invitation
      if (role === "member" && restrictSiteAccess && result.data?.id) {
        await authedFetch(`/organizations/${organizationId}/invitations/${result.data.id}/sites`, undefined, {
          method: "PUT",
          data: {
            hasRestrictedSiteAccess: true,
            siteIds: selectedSiteIds,
          },
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizationInvitations"] });
      toast.success(t("Invitation sent to {email}", { email }));
      setOpen(false);
      onSuccess();
      setEmail("");
      setRole("member");
      setRestrictSiteAccess(false);
      setSelectedSiteIds([]);
      setError("");
    },
    onError: (err: any) => {
      setError(err.message || t("Failed to send invitation"));
    },
  });

  const handleInvite = () => {
    setError("");

    if (!email) {
      setError(t("Email is required"));
      return;
    }

    if (role === "member" && restrictSiteAccess && selectedSiteIds.length === 0) {
      setError(t("Please select at least one site or disable site restrictions"));
      return;
    }

    inviteMutation.mutate();
  };

  if (isOverMemberLimit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button disabled size="sm" variant="outline" title={t("Upgrade to Pro to add more members")}>
              <UserPlus className="h-4 w-4 mr-1" />
              {t("Invite Member")}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {t("You have reached the limit of {limit} members. Upgrade to add more members", { limit: String(memberLimit) })}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-1" />
          {t("Invite Member")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Invite a new member")}</DialogTitle>
          <DialogDescription>{t("Invite a new member to this organization.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">{t("Role")}</Label>
            <Select
              value={role}
              onValueChange={value => {
                setRole(value as "admin" | "member" | "owner");
                if (value !== "member") {
                  setRestrictSiteAccess(false);
                  setSelectedSiteIds([]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Select a role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">{t("Owner")}</SelectItem>
                <SelectItem value="admin">{t("Admin")}</SelectItem>
                <SelectItem value="member">{t("Member")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "member" && (
            <div className="grid gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restrict-site-access"
                  checked={restrictSiteAccess}
                  onCheckedChange={checked => {
                    setRestrictSiteAccess(!!checked);
                    if (!checked) {
                      setSelectedSiteIds([]);
                    }
                  }}
                />
                <Label htmlFor="restrict-site-access" className="cursor-pointer">
                  {t("Restrict access to specific sites")}
                </Label>
              </div>
              {restrictSiteAccess && (
                <div className="pl-6">
                  <SiteAccessMultiSelect selectedSiteIds={selectedSiteIds} onChange={setSelectedSiteIds} />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("This member will only have access to the selected sites.")}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleInvite} disabled={inviteMutation.isPending} variant="success">
            {inviteMutation.isPending ? t("Inviting...") : t("Invite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
