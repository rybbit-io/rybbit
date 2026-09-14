"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";

import {
  useAdminOrganizationMember,
  useDeleteAdminOrganizationMember,
  useUpdateAdminOrganizationMember,
} from "@/api/admin/hooks/useAdminOrganizations";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth";
import { userStore } from "@/lib/userStore";

interface EditOrganizationMemberDialogProps {
  organizationId: string;
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrganizationMemberDialog({
  organizationId,
  memberId,
  open,
  onOpenChange,
}: EditOrganizationMemberDialogProps) {
  const t = useExtracted();
  const queryClient = useQueryClient();
  const details = useAdminOrganizationMember(organizationId, memberId, open);
  const updateMembership = useUpdateAdminOrganizationMember(organizationId, memberId ?? "");
  const deleteMembership = useDeleteAdminOrganizationMember(organizationId, memberId ?? "");
  const currentUserId = userStore.getState().user?.id;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [systemRole, setSystemRole] = useState<"user" | "admin">("user");
  const [memberRole, setMemberRole] = useState<"owner" | "admin" | "member">("member");
  const [restricted, setRestricted] = useState(false);
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const [banned, setBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banExpires, setBanExpires] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const value = details.data;
    if (!open || !value) return;
    setName(value.user.name ?? "");
    setEmail(value.user.email);
    setSystemRole(value.user.role === "admin" ? "admin" : "user");
    setMemberRole(value.membership.role);
    setRestricted(value.membership.hasRestrictedSiteAccess);
    setSiteIds(value.membership.siteIds);
    setBanned(value.user.banned);
    setBanReason(value.user.banReason ?? "");
    setBanExpires(value.user.banExpires ? DateTime.fromISO(value.user.banExpires).toFormat("yyyy-MM-dd'T'HH:mm") : "");
  }, [details.data, open]);

  const throwOnAuthError = (response: { error?: { message?: string } | null }, fallback: string) => {
    if (response.error) throw new Error(response.error.message || fallback);
  };

  const handleSave = async () => {
    const value = details.data;
    if (!value || !memberId) return;
    if (!name.trim() || !email.trim()) {
      toast.error(t("Name and email are required"));
      return;
    }
    if (memberRole === "member" && restricted && siteIds.length === 0) {
      toast.error(t("Select at least one site or disable site restrictions"));
      return;
    }

    setIsSaving(true);
    try {
      if (name.trim() !== value.user.name || email.trim().toLowerCase() !== value.user.email) {
        const response = await authClient.admin.updateUser({
          userId: value.user.id,
          data: { name: name.trim(), email: email.trim().toLowerCase() },
        });
        throwOnAuthError(response, t("Failed to update profile"));
      }

      if (systemRole !== value.user.role && value.user.id !== currentUserId) {
        const response = await authClient.admin.setRole({ userId: value.user.id, role: systemRole });
        throwOnAuthError(response, t("Failed to update system role"));
      }

      await updateMembership.mutateAsync({
        role: memberRole,
        hasRestrictedSiteAccess: memberRole === "member" && restricted,
        siteIds: memberRole === "member" && restricted ? siteIds : [],
      });

      if (value.user.id !== currentUserId) {
        if (banned) {
          const expiry = banExpires ? DateTime.fromFormat(banExpires, "yyyy-MM-dd'T'HH:mm") : null;
          if (expiry && (!expiry.isValid || expiry <= DateTime.now())) {
            throw new Error(t("Ban expiry must be in the future"));
          }
          const response = await authClient.admin.banUser({
            userId: value.user.id,
            banReason: banReason.trim() || undefined,
            banExpiresIn: expiry ? Math.ceil(expiry.diffNow("seconds").seconds) : undefined,
          });
          throwOnAuthError(response, t("Failed to ban user"));
        } else if (value.user.banned) {
          const response = await authClient.admin.unbanUser({ userId: value.user.id });
          throwOnAuthError(response, t("Failed to unban user"));
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
      toast.success(t("Member updated successfully"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to update member"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      await deleteMembership.mutateAsync();
      toast.success(t("Member removed successfully"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to remove member"));
    }
  };

  const value = details.data;
  const isSelf = value?.user.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Edit organization member")}</DialogTitle>
          <DialogDescription>{t("Manage this member's account and organization access directly.")}</DialogDescription>
        </DialogHeader>

        {details.isLoading || !value ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-member-name">{t("Name")}</Label>
                <Input id="admin-member-name" value={name} onChange={event => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-member-email">{t("Email")}</Label>
                <Input
                  id="admin-member-email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("System role")}</Label>
                <Select
                  value={systemRole}
                  onValueChange={role => setSystemRole(role as "user" | "admin")}
                  disabled={isSelf}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("User")}</SelectItem>
                    <SelectItem value="admin">{t("Admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("Organization role")}</Label>
                <Select value={memberRole} onValueChange={role => setMemberRole(role as typeof memberRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">{t("Owner")}</SelectItem>
                    <SelectItem value="admin">{t("Admin")}</SelectItem>
                    <SelectItem value="member">{t("Member")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            {memberRole === "member" && (
              <section className="space-y-3 border-t border-neutral-150 pt-4 dark:border-neutral-800">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="restrict-member-sites">{t("Restrict access to specific sites")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("When disabled, the member can access every site in this organization.")}
                    </p>
                  </div>
                  <Switch id="restrict-member-sites" checked={restricted} onCheckedChange={setRestricted} />
                </div>
                {restricted && (
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-neutral-150 p-2 dark:border-neutral-800">
                    {value.sites.map(site => (
                      <label
                        key={site.siteId}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Checkbox
                          checked={siteIds.includes(site.siteId)}
                          onCheckedChange={checked =>
                            setSiteIds(current =>
                              checked
                                ? [...new Set([...current, site.siteId])]
                                : current.filter(id => id !== site.siteId)
                            )
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">{site.name || site.domain}</span>
                        <span className="max-w-48 truncate text-xs text-muted-foreground">{site.domain}</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="space-y-4 border-t border-neutral-150 pt-4 dark:border-neutral-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="ban-member">{t("Ban user")}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isSelf ? t("You cannot ban your own account.") : t("Banning revokes the user's active sessions.")}
                  </p>
                </div>
                <Switch id="ban-member" checked={banned} onCheckedChange={setBanned} disabled={isSelf} />
              </div>
              {banned && !isSelf && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ban-reason">{t("Reason")}</Label>
                    <Input id="ban-reason" value={banReason} onChange={event => setBanReason(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ban-expiry">{t("Expires")}</Label>
                    <Input
                      id="ban-expiry"
                      type="datetime-local"
                      value={banExpires}
                      onChange={event => setBanExpires(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{t("Leave blank for a permanent ban.")}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-150 pt-4 dark:border-neutral-800">
              <div>
                <div className="text-sm font-medium text-red-600 dark:text-red-400">{t("Remove membership")}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Remove this user from this organization without deleting their account.")}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    {t("Remove member")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("Remove this member?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("They will immediately lose access to this organization's sites and data.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleRemove}
                      disabled={deleteMembership.isPending}
                    >
                      {deleteMembership.isPending ? t("Removing...") : t("Remove member")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="success" onClick={handleSave} disabled={!value || isSaving}>
            {isSaving ? t("Saving...") : t("Save changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
