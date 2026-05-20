"use client";

import { useQueryState, parseAsBoolean, parseAsStringEnum } from "nuqs";
import { useCurrentSite } from "../../api/admin/hooks/useSites";

export type EmbedTheme = "light" | "dark" | "system";

const parseAsEmbedTheme = parseAsStringEnum<EmbedTheme>(["light", "dark", "system"]);

export const useEmbedPageOptions = () => {
  const [embed] = useQueryState("embed", parseAsBoolean);
  const [hideSidebar] = useQueryState("hideSidebar", parseAsBoolean);
  const [theme] = useQueryState("theme", parseAsEmbedTheme);

  const { subscription } = useCurrentSite();

  const isEmbedPage = !!embed && subscription?.planName !== "free";

  return {
    embed: isEmbedPage,
    hideSidebar: isEmbedPage && !!hideSidebar,
    theme: isEmbedPage ? (theme ?? "system") : null,
  };
};

export const useEmbedablePage = () => {
  return useEmbedPageOptions().embed;
};
