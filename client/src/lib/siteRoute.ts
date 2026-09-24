export const PRIVATE_KEY_PATTERN = /^[a-f0-9]{12}$/i;

export const SYNCED_ANALYTICS_ROUTES = new Set([
  "main",
  "sessions",
  "users",
  "performance",
  "globe",
  "goals",
  "events",
  "funnels",
  "journeys",
  "errors",
  "pages",
  "replay",
  "feature-flags",
  "experiments",
]);

export type SiteRouteContext = {
  siteId: string | null;
  privateKey: string | null;
  route: string | null;
};

export function getSiteRouteContext(pathname: string | null | undefined): SiteRouteContext {
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const siteId = segments[0] ?? null;
  const hasPrivateKey = !!segments[1] && PRIVATE_KEY_PATTERN.test(segments[1]);

  return {
    siteId,
    privateKey: hasPrivateKey ? segments[1] : null,
    route: hasPrivateKey ? (segments[2] ?? null) : (segments[1] ?? null),
  };
}

export function isSyncedAnalyticsRoute(route: string | null | undefined) {
  return !!route && SYNCED_ANALYTICS_ROUTES.has(route);
}

export function getMainDashboardPath(pathname: string | null | undefined) {
  const { siteId, privateKey } = getSiteRouteContext(pathname);
  if (!siteId || isNaN(Number(siteId))) return null;

  return privateKey ? `/${siteId}/${privateKey}/main` : `/${siteId}/main`;
}
