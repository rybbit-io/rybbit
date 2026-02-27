"use client";

import { useExtracted } from "next-intl";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { AccountInner } from "./components/AccountInner";

export default function AccountPage() {
  useSetPageTitle("Account");
  const t = useExtracted();

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("Account Settings")}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t("Manage your personal account settings")}</p>
      </div>
      <AccountInner />
    </>
  );
}
