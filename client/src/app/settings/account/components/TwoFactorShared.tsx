"use client";

import { AlertTriangle, Download } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { CopyButton } from "@/components/interior/copy-button";
import { toast } from "@/components/ui/sonner";
import { Button } from "../../../../components/ui/button";
import { DialogFooter } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

interface PasswordFormProps {
  submitLabel: string;
  pendingLabel: string;
  variant?: "success" | "destructive";
  onSubmit: (password: string) => Promise<string | void>;
  onCancel: () => void;
  onPendingChange?: (pending: boolean) => void;
}

export function PasswordForm({
  submitLabel,
  pendingLabel,
  variant = "success",
  onSubmit,
  onCancel,
  onPendingChange,
}: PasswordFormProps) {
  const t = useExtracted();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        setPending(true);
        onPendingChange?.(true);
        setError("");
        try {
          const message = await onSubmit(password);
          if (message) setError(message);
        } catch {
          setError(t("Something went wrong. Try again."));
        } finally {
          setPending(false);
          onPendingChange?.(false);
        }
      }}
    >
      <div className="space-y-2 py-2">
        <Label htmlFor="two-factor-password">{t("Password")}</Label>
        <Input
          id="two-factor-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          aria-invalid={!!error}
        />
        {error && (
          <p role="alert" className="text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="sm:flex-1" onClick={onCancel} disabled={pending}>
          {t("Cancel")}
        </Button>
        <Button
          type="submit"
          variant={variant}
          className="sm:flex-1"
          loading={pending}
          loadingLabel={pendingLabel}
          disabled={!password}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface BackupCodesProps {
  codes: string[];
  email: string;
  onSaved: () => void;
  showCloseWarning: boolean;
}

export function BackupCodes({ codes, email, onSaved, showCloseWarning }: BackupCodesProps) {
  const t = useExtracted();

  const download = () => {
    const text = [
      t("Rybbit backup codes for {email}", { email }),
      "",
      ...codes,
      "",
      t("Each code works once. Use one when you can't use your authenticator app."),
      "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "rybbit-backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
    onSaved();
  };

  return (
    <div className="space-y-3">
      <ul
        onCopy={onSaved}
        className="grid select-all grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg border border-neutral-100 bg-neutral-50 p-3 font-mono text-sm tabular-nums dark:border-neutral-800 dark:bg-neutral-900"
      >
        {codes.map(code => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      {showCloseWarning && (
        <p role="alert" className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("You haven't saved these codes yet. Once you close this dialog, they can't be shown again.")}
        </p>
      )}
      <div className="flex gap-2">
        <CopyButton
          variant="outline"
          className="flex-1"
          value={codes.join("\n")}
          label={t("Copy codes")}
          onCopy={onSaved}
          onError={() => toast.error(t("Couldn't copy to clipboard. Select the codes and copy them manually."))}
        />
        <Button variant="outline" className="flex-1" onClick={download}>
          <Download />
          {t("Download")}
        </Button>
      </div>
    </div>
  );
}
