import { usePathname, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth";
import { getSiteRouteContext } from "@/lib/siteRoute";

/**
 * The palette and the "?" sheet exist for signed-in users. Public dashboards,
 * the claim flow and shared private links are for visitors, so they get
 * neither. Embedded dashboards also omit these overlays and their trigger.
 */
export function useCommandPaletteAvailable(): boolean {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return !!session?.user && !getSiteRouteContext(pathname).privateKey && searchParams.get("embed") !== "true";
}
