"use client";

import { useExtracted } from "next-intl";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { AccountInner } from "./components/AccountInner";
import { ExternalLink } from "../../../components/ExternalLink";

export default function AccountPage() {
  useSetPageTitle("Account");
  const t = useExtracted();

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("Account Settings")}</h1>
        <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
          {t("Manage your personal account settings")}
          <ExternalLink href="https://www.rybbit.com/docs/account-settings">
            {t("Learn more")}
          </ExternalLink>
        </p>
      </div>
      <AccountInner />
    </>
  );
}
