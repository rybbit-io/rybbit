"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert } from "../../../../../components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { authClient } from "../../../../../lib/auth";
import { IS_CLOUD, STANDARD_TEAM_LIMIT } from "../../../../../lib/const";
import { SubscriptionData, useStripeSubscription } from "../../../../../lib/subscription/useStripeSubscription";

interface InviteMemberDialogProps {
  organizationId: string;
  onSuccess: () => void;
  memberCount: number;
}

const getMemberLimit = (subscription: SubscriptionData | undefined) => {
  if (subscription?.status !== "active") return 1;
  if (subscription?.planName.includes("pro")) return Infinity;
  if (subscription?.planName.includes("standard")) return STANDARD_TEAM_LIMIT;
  if (subscription?.planName === "appsumo-1") return 1;
  if (subscription?.planName === "appsumo-2") return 3;
  if (subscription?.planName === "appsumo-3") return 10;
  if (subscription?.planName === "appsumo-4") return 25;
  if (subscription?.planName === "appsumo-5") return 50;
  if (subscription?.planName === "appsumo-6") return Infinity;
  return 1;
};

export function InviteMemberDialog({ organizationId, onSuccess, memberCount }: InviteMemberDialogProps) {
  const { data: subscription } = useStripeSubscription();

  const isOverMemberLimit = useMemo(() => {
    if (!IS_CLOUD) return false;
    const limit = getMemberLimit(subscription);
    return memberCount >= limit;
  }, [subscription, memberCount]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "owner">("member");

  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.organization.inviteMember({
        email,
        role,
        organizationId,
        resend: true,
      });

      toast.success(`Invitation sent to ${email}`);
      setOpen(false);
      onSuccess();
      setEmail("");
      setRole("member");
    } catch (error: any) {
      setError(error.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  if (isOverMemberLimit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button disabled size="sm" variant="outline" title="Upgrade to Pro to add more members">
              <UserPlus className="h-4 w-4 mr-1" />
              Invite Member
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          You have reached the limit of {getMemberLimit(subscription)} member
          {getMemberLimit(subscription) > 1 ? "s" : ""}. Upgrade to add more members
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-1" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a new member</DialogTitle>
          <DialogDescription>Invite a new member to this organization.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={value => setRole(value as "admin" | "member")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isLoading} variant="success">
            {isLoading ? "Inviting..." : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
