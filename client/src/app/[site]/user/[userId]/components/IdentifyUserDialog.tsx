"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

import { useIdentifyUser } from "@/api/analytics/hooks/useIdentifyUser";
import { Button } from "@/components/ui/button";
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

interface IdentifyUserDialogProps {
  anonymousId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdentifyUserDialog({ anonymousId, open, onOpenChange }: IdentifyUserDialogProps) {
  const t = useExtracted();
  const identifyUser = useIdentifyUser();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) return;

    const traits: Record<string, unknown> = {};
    if (name.trim()) traits.name = name.trim();
    if (email.trim()) traits.email = email.trim();

    try {
      await identifyUser.mutateAsync({
        anonymousId,
        userId: trimmedUserId,
        traits: Object.keys(traits).length > 0 ? traits : undefined,
      });
      toast.success(t("User identified"));
      onOpenChange(false);
      setUserId("");
      setName("");
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to identify user"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Identify User")}</DialogTitle>
          <DialogDescription>
            {t("Assign a user ID to this visitor. Their past activity from this device will be linked to it.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="identify-user-id">{t("User ID")}</Label>
            <Input
              id="identify-user-id"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              maxLength={255}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("The ID this person has in your own system, like an email or account ID.")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="identify-name">{t("Name")}</Label>
            <Input id="identify-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="identify-email">{t("Email")}</Label>
            <Input id="identify-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="success" disabled={identifyUser.isPending || !userId.trim()}>
              {identifyUser.isPending ? t("Identifying...") : t("Identify")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
