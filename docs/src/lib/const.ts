export const DEFAULT_EVENT_LIMIT = 3_000;

export const FREE_SITE_LIMIT = 1;
export const BASIC_SITE_LIMIT = 1;
export const BASIC_TEAM_LIMIT = 1;
export const STANDARD_SITE_LIMIT = 5;
export const STANDARD_TEAM_LIMIT = 3;

// The demo dashboard only allows cross-origin framing on private-link paths
// (/{siteId}/{key}/...); the public /81/... pages send frame-ancestors 'self'.
// Iframes use the embed URL; plain links can keep the public one.
const DEMO_PUBLIC_BASE = "https://demo.rybbit.com/81";
const DEMO_EMBED_BASE = "https://demo.rybbit.com/81/d788e41738d4";

export function toDemoEmbedUrl(publicUrl: string) {
  return publicUrl.startsWith(DEMO_PUBLIC_BASE)
    ? DEMO_EMBED_BASE + publicUrl.slice(DEMO_PUBLIC_BASE.length)
    : publicUrl;
}
