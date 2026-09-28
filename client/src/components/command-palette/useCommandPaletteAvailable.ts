import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth";
import { getSiteRouteContext } from "@/lib/siteRoute";

/**
 * The palette and the "?" sheet exist for signed-in users. Public dashboards,
 * the claim flow and shared private links are for visitors, so they get
 * neither. (Embeds are checked when a key arrives: see isEmbedView.)
 */
export function useCommandPaletteAvailable(): boolean {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  return !!session?.user && !getSiteRouteContext(pathname).privateKey;
}
