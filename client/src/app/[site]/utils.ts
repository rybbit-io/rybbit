"use client";

import { useQueryState, parseAsBoolean } from "nuqs";
import { useCurrentSite } from "../../api/admin/sites";

export const useEmbedablePage = () => {
  const [embed] = useQueryState("embed", parseAsBoolean);

  const { subscription } = useCurrentSite();

  if (embed && subscription?.planName !== "free") {
    return true;
  }

  return false;
};
