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
import { authClient } from "@/lib/auth";
import { UserMinus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Member } from "../page";

interface RemoveMemberDialogProps {
  member: Member;
  organizationId: string;
  onSuccess: () => void;
}

export function RemoveMemberDialog({ member, organizationId, onSuccess }: RemoveMemberDialogProps) {
  const t = useExtracted();
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      // Using the appropriate method and parameters based on Better Auth API
      await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId,
      });

      toast.success(t("Member removed successfully"));
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || t("Failed to remove member"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="smIcon" variant="ghost" className="text-destructive">
          <UserMinus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Remove Member")}</DialogTitle>
          <DialogDescription>
            {t("Are you sure you want to remove {name} from the organization?", { name: member.user.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={isLoading}>
            {isLoading ? t("Removing...") : t("Remove Member")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
