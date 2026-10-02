"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth";
import { useUpdateAccountSettings } from "../../../../api/admin/hooks/useAccountSettings";
import { LanguageSwitcher } from "../../../../components/LanguageSwitcher";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Switch } from "../../../../components/ui/switch";
import { useActiveOrgName } from "../../../../hooks/useActiveOrgName";
import { validateEmail } from "../../../../lib/auth-utils";
import { IS_CLOUD } from "../../../../lib/const";
import { DangerRow, DangerZone, LedgerRow, LedgerRows, LedgerSaveBar, LedgerSection } from "../../components/Ledger";
import { ApiKeyManager } from "./ApiKeyManager";
import { ChangePassword } from "./ChangePassword";
import { DeleteAccount, useHasActiveSubscription } from "./DeleteAccount";

const INLINE_LINK =
  "font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-300";

export function AccountInner() {
  const session = authClient.useSession();
  const updateAccountSettings = useUpdateAccountSettings();
  const hasActiveSubscription = useHasActiveSubscription();
  const orgName = useActiveOrgName();
  const t = useExtracted();

  const user = session.data?.user;
  const currentName = user?.name ?? "";
  const currentEmail = user?.email ?? "";
  // Returned by the server but not part of the client's inferred session type.
  const sendAutoEmailReports = (user as { sendAutoEmailReports?: boolean } | undefined)?.sendAutoEmailReports;

  // null while the field shows the saved name; a string once it has been edited.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const name = nameDraft ?? currentName;
  const nameDirty = nameDraft !== null && nameDraft !== currentName;

  // null while the email row shows the current address; a string while a new one is being entered.
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const handleNameUpdate = async () => {
    if (!name.trim()) {
      toast.error(t("Name cannot be empty"));
      return;
    }

    try {
      setIsUpdatingName(true);
      const response = await authClient.updateUser({
        name,
      });

      if (response.error) {
        throw new Error(response.error.message || t("Failed to update name"));
      }

      toast.success(t("Name updated successfully"));
      await session.refetch();
      setNameDraft(null);
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to update name"));
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleEmailUpdate = async () => {
    const email = newEmail ?? "";
    if (!email) {
      toast.error(t("Email cannot be empty"));
      return;
    }

    if (!validateEmail(email)) {
      toast.error(t("Please enter a valid email address"));
      return;
    }

    try {
      setIsUpdatingEmail(true);
      const response = await authClient.changeEmail({
        newEmail: email,
      });

      if (response.error) {
        throw new Error(response.error.message || t("Failed to update email"));
      }

      // The email isn't changed yet — better-auth sends a confirmation link
      // to the current address if it's verified, otherwise to the new one.
      const confirmationEmail = user?.emailVerified ? currentEmail : email;
      toast.success(
        t("A confirmation link has been sent to {email}. Your email will be updated once you confirm the change.", {
          email: confirmationEmail,
        })
      );
      setNewEmail(null);
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to update email"));
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleEmailReportsToggle = async (checked: boolean) => {
    try {
      await updateAccountSettings.mutateAsync({
        sendAutoEmailReports: checked,
      });
      toast.success(t("Email reports {status}", { status: checked ? t("enabled") : t("disabled") }));
      session.refetch();
    } catch (error) {
      console.error("Error updating email reports setting:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to update email reports setting"));
    }
  };

  return (
    <>
      <LedgerSection title={t("Profile")}>
        <LedgerRows>
          <LedgerRow label={t("Name")} description={t("Shown to teammates in member lists.")} htmlFor="account-name">
            <Input
              id="account-name"
              autoComplete="name"
              value={name}
              onChange={({ target }) => setNameDraft(target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && nameDirty && !isUpdatingName) {
                  e.preventDefault();
                  handleNameUpdate();
                }
              }}
              className="max-w-sm"
            />
          </LedgerRow>
          <LedgerRow
            label={t("Email")}
            description={t("For sign-in, reports and invitations.")}
            htmlFor={newEmail === null ? undefined : "account-new-email"}
          >
            {newEmail === null ? (
              <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-0 break-all text-sm">{currentEmail}</span>
                {user?.emailVerified && (
                  <Badge variant="success" className="gap-1">
                    <Check className="size-3" aria-hidden="true" />
                    {t("Verified")}
                  </Badge>
                )}
                <Button size="sm" className="ml-auto" onClick={() => setNewEmail("")}>
                  {t("Change email")}
                </Button>
              </div>
            ) : (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  handleEmailUpdate();
                }}
              >
                <Input
                  id="account-new-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={newEmail}
                  onChange={({ target }) => setNewEmail(target.value)}
                  onKeyDown={e => {
                    if (e.key === "Escape" && !isUpdatingEmail) setNewEmail(null);
                  }}
                  placeholder="email@example.com"
                  className="max-w-sm"
                />
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewEmail(null)}
                    disabled={isUpdatingEmail}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="success"
                    size="sm"
                    loading={isUpdatingEmail}
                    loadingLabel={t("Sending...")}
                    disabled={!newEmail || newEmail === currentEmail}
                  >
                    {t("Send confirmation link")}
                  </Button>
                </div>
              </form>
            )}
            <p className="mt-2 max-w-[62ch] text-xs leading-4 text-neutral-500 dark:text-neutral-400">
              {user?.emailVerified
                ? t(
                    "To change it, we email a confirmation link to {email} first, then a link to the new address. The new address takes over once you click both.",
                    { email: currentEmail }
                  )
                : t("To change it, we email a link to the new address. It takes over once you click that link.")}
            </p>
          </LedgerRow>
        </LedgerRows>
        <LedgerSaveBar
          dirty={nameDirty}
          saving={isUpdatingName}
          onCancel={() => setNameDraft(null)}
          onSave={handleNameUpdate}
        />
      </LedgerSection>

      <LedgerSection title={t("Preferences")}>
        <LedgerRows>
          {sendAutoEmailReports !== undefined && IS_CLOUD && (
            <LedgerRow
              label={t("Weekly email reports")}
              description={t("A traffic summary for each site you can access.")}
              htmlFor="account-email-reports"
            >
              <div className="flex min-h-9 items-center gap-3">
                <Switch
                  id="account-email-reports"
                  checked={sendAutoEmailReports}
                  onCheckedChange={handleEmailReportsToggle}
                  disabled={updateAccountSettings.isPending}
                />
                <span className="min-w-0 break-words text-sm text-neutral-500 dark:text-neutral-400">
                  {sendAutoEmailReports ? t("On, sent to {email}", { email: currentEmail }) : t("Off")}
                </span>
              </div>
            </LedgerRow>
          )}
          <LedgerRow label={t("Language")} description={t("For menus and labels.")}>
            <LanguageSwitcher />
          </LedgerRow>
        </LedgerRows>
      </LedgerSection>

      <LedgerSection title={t("Sign-in & security")}>
        <LedgerRows>
          <LedgerRow label={t("Password")} description={t("Used with your email to sign in.")}>
            <div className="flex min-h-9 items-center justify-end">
              <ChangePassword />
            </div>
          </LedgerRow>
        </LedgerRows>
      </LedgerSection>

      <ApiKeyManager />

      <DangerZone>
        <DangerRow
          label={t("Delete account")}
          description={t("Permanent. There is no undo.")}
          consequence={
            <>
              {t(
                "Deletes your profile, your sign-in and your personal API keys, and removes you from every organization."
              )}
              {hasActiveSubscription && (
                <>
                  {" "}
                  {t.rich("{name} has an active subscription, so cancel it in <link>Billing</link> first.", {
                    name: orgName ?? t("Your organization"),
                    link: chunks => (
                      <Link href="/settings/billing" className={INLINE_LINK}>
                        {chunks}
                      </Link>
                    ),
                  })}
                </>
              )}
            </>
          }
          action={<DeleteAccount />}
        />
      </DangerZone>
    </>
  );
}
