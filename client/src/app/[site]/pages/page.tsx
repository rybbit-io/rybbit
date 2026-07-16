"use client";

import { useExtracted } from "next-intl";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { useStore } from "@/lib/store";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { PagesTable } from "./components/PagesTable";

export default function Pages() {
  const t = useExtracted();
  const { site } = useStore();

  useSetPageTitle("Pages");

  if (!site) {
    return null;
  }

  return (
    <DisabledOverlay message={t("pages")} featurePath="pages">
      <div className="p-2 md:p-4 max-w-[1400px] mx-auto space-y-3">
        <SubHeader />
        <PagesTable />
      </div>
    </DisabledOverlay>
  );
}
