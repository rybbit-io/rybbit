import { getSiteRouteContext } from "@/lib/siteRoute";

// Every section the site sidebar links to. Switching site from one of these
// keeps the section; anything deeper (a dashboard, a user profile) falls back
// to that site's main page.
const SITE_SECTION_ROUTES = new Set([
  "main",
  "pages",
  "globe",
  "bots",
  "sessions",
  "replay",
  "users",
  "events",
  "goals",
  "funnels",
  "journeys",
  "retention",
  "errors",
  "performance",
  "api-playground",
  "query",
  "dashboards",
]);

// Site pages that mount a DateSelector. The palette offers date presets only
// where its single-key hotkeys work, so a preset never changes a range nobody
// can see. Keep in sync with the pages that render <SubHeader> or <DateSelector>.
const DATE_SELECTOR_ROUTES = new Set([
  "main",
  "pages",
  "globe",
  "bots",
  "sessions",
  "replay",
  "users",
  "user",
  "events",
  "goals",
  "funnels",
  "journeys",
  "retention",
  "errors",
  "performance",
  "experiments",
]);

const isNumericId = (segment: string | null): segment is string => !!segment && /^\d+$/.test(segment);

/** The site whose pages are open, or null outside a site (home, settings, admin). */
export function getActiveSiteId(pathname: string): number | null {
  const { siteId } = getSiteRouteContext(pathname);
  return isNumericId(siteId) ? Number(siteId) : null;
}

/** True on pages whose DateSelector answers the preset hotkeys. */
export function hasDateSelector(pathname: string): boolean {
  if (pathname === "/" || pathname === "/rollup" || pathname.startsWith("/rollup/")) return true;

  const { siteId, route } = getSiteRouteContext(pathname);
  if (!isNumericId(siteId) || !route) return false;
  // The dashboards list has no range; an open dashboard does.
  if (route === "dashboards") return pathname.split("/").filter(Boolean).length > 2;
  return DATE_SELECTOR_ROUTES.has(route);
}

/** Where switching to `siteId` lands: the same section of the other site, or its main page. */
export function getSwitchSitePath(pathname: string, siteId: number): string {
  const { route } = getSiteRouteContext(pathname);
  const onSite = getActiveSiteId(pathname) !== null;
  const section = onSite && route && SITE_SECTION_ROUTES.has(route) ? route : "main";
  return `/${siteId}/${section}`;
}
