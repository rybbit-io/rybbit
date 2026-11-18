"use client";

import { useQuery } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import { Skeleton } from "../../../../components/ui/skeleton";
import { authClient } from "../../../../lib/auth";
import { TwoFactorSetup } from "./TwoFactorSetup";
import { BackupCodes, PasswordForm } from "./TwoFactorShared";

const MUTED = "text-neutral-500 dark:text-neutral-400";

export function TwoFactor() {
  const t = useExtracted();
  const session = authClient.useSession();
  const user = session.data?.user as { id: string; email: string; twoFactorEnabled?: boolean | null } | undefined;
  const accounts = useQuery({
    queryKey: ["user-accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });
  const [setupOpen, setSetupOpen] = useState(false);

  if (!user || accounts.isLoading) return <Skeleton className="h-9 w-40" />;
  if (accounts.isError) {
    return <p className={`flex min-h-9 items-center text-sm ${MUTED}`}>{t("Couldn't load your sign-in methods.")}</p>;
  }

  const hasPassword = accounts.data?.some(account => account.providerId === "credential");

  return (
    // Wraps the row so confirming the first code, which turns the row on, doesn't close the dialog.
    <TwoFactorSetup open={setupOpen} onOpenChange={setSetupOpen} email={user.email}>
      {user.twoFactorEnabled ? (
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant="success">{t("On")}</Badge>
          <div className="ml-auto flex items-center gap-1.5">
            <NewBackupCodes email={user.email} />
            <TurnOff />
          </div>
        </div>
      ) : hasPassword ? (
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`text-sm ${MUTED}`}>{t("Off")}</span>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto">
              {t("Turn on")}
            </Button>
          </DialogTrigger>
        </div>
      ) : (
        <p className={`flex min-h-9 items-center text-sm ${MUTED}`}>
          {t("You sign in with Google or GitHub. Turn on two-factor authentication in that account instead.")}
        </p>
      )}
    </TwoFactorSetup>
  );
}

function TurnOff() {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const turnOff = async (password: string) => {
    const { error } = await authClient.twoFactor.disable({ password });
    if (error) return error.message || t("Couldn't turn off two-factor authentication");
    setOpen(false);
    toast.success(t("Two-factor authentication is off"));
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => (isOpen || !pending) && setOpen(isOpen)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {t("Turn off")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Turn off two-factor authentication?")}</DialogTitle>
          <DialogDescription>
            {t("Signing in will only need your password. Your backup codes and trusted devices stop working.")}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PasswordForm
            submitLabel={t("Turn off")}
            pendingLabel={t("Turning off...")}
            variant="destructive"
            onSubmit={turnOff}
            onCancel={() => setOpen(false)}
            onPendingChange={setPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewBackupCodes({ email }: { email: string }) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [codesSaved, setCodesSaved] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pending, setPending] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && pending) return;
    if (!isOpen && codes && !codesSaved && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    setOpen(isOpen);
    if (!isOpen) {
      setCodes(null);
      setCodesSaved(false);
      setConfirmClose(false);
    }
  };

  const generate = async (password: string) => {
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
    if (error) return error.message || t("Couldn't create new backup codes");
    setCodes(data.backupCodes);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("New backup codes")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("New backup codes")}</DialogTitle>
          <DialogDescription>
            {codes
              ? t("Your old backup codes no longer work. Keep these somewhere safe.")
              : t("This replaces your current backup codes. Enter your password to continue.")}
          </DialogDescription>
        </DialogHeader>
        {codes ? (
          <>
            <BackupCodes
              codes={codes}
              email={email}
              onSaved={() => setCodesSaved(true)}
              showCloseWarning={confirmClose && !codesSaved}
            />
            <DialogFooter>
              <Button variant="success" className="w-full" onClick={() => handleOpenChange(false)}>
                {confirmClose && !codesSaved ? t("Close anyway") : t("Done")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          open && (
            <PasswordForm
              submitLabel={t("Create new codes")}
              pendingLabel={t("Creating...")}
              onSubmit={generate}
              onCancel={() => handleOpenChange(false)}
              onPendingChange={setPending}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
