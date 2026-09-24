"use client";

import { useExtracted } from "next-intl";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";

export default function ReportsPage() {
  const t = useExtracted();
  useSetPageTitle("Reports");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("Reports")}</h1>
      <p className="text-neutral-400">{t("Reports and analytics content will go here.")}</p>
    </div>
  );
}
