"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { useCancelSiteTransfer, useCreateSiteTransfer, useSiteTransfer } from "@/api/admin/hooks/useSiteTransfers";
import { CopyButton } from "@/components/interior/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { getTimezone } from "@/lib/store";

import { SettingsSection } from "./SettingsSection";

/**
 * Hands the site to someone outside the organization: they get an emailed link,
 * accept it into an organization they manage, and the site moves there. Render
 * only for people with sites:transfer on the site.
 */
export function TransferSiteSection({ siteId }: { siteId: number }) {
  const t = useExtracted();
  const { data: transfer, isLoading } = useSiteTransfer(siteId);
  const createTransfer = useCreateSiteTransfer(siteId);
  const cancelTransfer = useCancelSiteTransfer(siteId);
  const [email, setEmail] = useState("");

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const recipient = email.trim();
    if (!recipient) return;
    createTransfer.mutate(recipient, {
      onSuccess: () => {
        toast.success(t("Transfer sent to {email}", { email: recipient }));
        setEmail("");
      },
      onError: error => toast.error(error.message || t("Failed to send the transfer")),
    });
  };

  const handleCancel = () => {
    cancelTransfer.mutate(undefined, {
      onSuccess: () => toast.success(t("Transfer cancelled")),
      onError: error => toast.error(error.message || t("Failed to cancel the transfer")),
    });
  };

  return (
    <SettingsSection
      title={t("Transfer to someone else")}
      description={t(
        "The recipient gets an email and accepts the site into an organization they manage. It moves with all its data, except its Search Console connection."
      )}
    >
      {isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : transfer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-150 px-4 py-3 dark:border-neutral-800">
          <p className="min-w-0 text-sm text-foreground">
            {t("Pending transfer to {email} · expires {date}", {
              email: transfer.recipientEmail,
              date: DateTime.fromISO(transfer.expiresAt).setZone(getTimezone()).toLocaleString(DateTime.DATE_MED),
            })}
          </p>
          <div className="flex shrink-0 gap-2">
            <CopyButton
              size="sm"
              variant="outline"
              value={transfer.url}
              label={t("Copy link")}
              onError={() => toast.error(t("Couldn't copy the link. Select it and copy it manually."))}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              loading={cancelTransfer.isPending}
              loadingLabel={t("Cancelling...")}
            >
              {t("Cancel transfer")}
            </Button>
          </div>
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={handleSend}>
          <Input
            type="email"
            aria-label={t("Recipient email")}
            placeholder="name@example.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            loading={createTransfer.isPending}
            loadingLabel={t("Sending...")}
            disabled={!email.trim()}
          >
            {t("Send transfer")}
          </Button>
        </form>
      )}
    </SettingsSection>
  );
}
