"use client";

import { useSearchParams } from "next/navigation";
import { useCurrentSite } from "../../api/admin/sites";

export const useEmbedablePage = () => {
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed");

  const { subscription } = useCurrentSite();

  if (embed === "true" && subscription?.planName !== "free") {
    return true;
  }

  return false;
};
