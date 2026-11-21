import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Address6 } from "ip-address";
import { isPublicHttpAddress } from "../../lib/publicHttpFetch.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("platform-detect");

export interface PlatformInfo {
  key: string;
  label: string;
  guideUrl: string;
}

const GUIDE_BASE = "https://rybbit.com/docs/guides";

// Ordered: more specific markers first (e.g. WooCommerce implies WordPress, Nuxt implies Vue)
const PLATFORM_MARKERS: Array<{ pattern: RegExp; platform: PlatformInfo }> = [
  { pattern: /woocommerce/i, platform: { key: "woocommerce", label: "WooCommerce", guideUrl: `${GUIDE_BASE}/woocommerce` } },
  { pattern: /wp-content|wp-includes|content="WordPress/i, platform: { key: "wordpress", label: "WordPress", guideUrl: `${GUIDE_BASE}/wordpress` } },
  { pattern: /cdn\.shopify\.com|Shopify\.theme/i, platform: { key: "shopify", label: "Shopify", guideUrl: `${GUIDE_BASE}/shopify` } },
  { pattern: /data-wf-domain|assets\.website-files\.com|assets-global\.website-files\.com/i, platform: { key: "webflow", label: "Webflow", guideUrl: `${GUIDE_BASE}/webflow` } },
  { pattern: /framerusercontent\.com|framerstatic/i, platform: { key: "framer", label: "Framer", guideUrl: `${GUIDE_BASE}/framer` } },
  { pattern: /static\.parastorage\.com|wix\.com\/website/i, platform: { key: "wix", label: "Wix", guideUrl: `${GUIDE_BASE}/wix` } },
  { pattern: /squarespace\.com|content="Squarespace/i, platform: { key: "squarespace", label: "Squarespace", guideUrl: `${GUIDE_BASE}/squarespace` } },
  { pattern: /content="Ghost/i, platform: { key: "ghost", label: "Ghost", guideUrl: `${GUIDE_BASE}/ghost` } },
  { pattern: /content="Docusaurus/i, platform: { key: "docusaurus", label: "Docusaurus", guideUrl: `${GUIDE_BASE}/docusaurus` } },
  { pattern: /content="Astro|astro-island/i, platform: { key: "astro", label: "Astro", guideUrl: `${GUIDE_BASE}/astro` } },
  { pattern: /__NUXT__|nuxt\./i, platform: { key: "nuxt", label: "Nuxt", guideUrl: `${GUIDE_BASE}/vue/nuxt` } },
  { pattern: /__remixContext/i, platform: { key: "remix", label: "Remix", guideUrl: `${GUIDE_BASE}/react/remix` } },
  { pattern: /___gatsby/i, platform: { key: "gatsby", label: "Gatsby", guideUrl: `${GUIDE_BASE}/react/gatsby` } },
  { pattern: /__NEXT_DATA__|\/_next\//i, platform: { key: "next-js", label: "Next.js", guideUrl: `${GUIDE_BASE}/react/next-js` } },
  { pattern: /sveltekit/i, platform: { key: "sveltekit", label: "SvelteKit", guideUrl: `${GUIDE_BASE}/svelte/sveltekit` } },
  { pattern: /content="Hugo/i, platform: { key: "hugo", label: "Hugo", guideUrl: `${GUIDE_BASE}/hugo` } },
  { pattern: /content="Drupal/i, platform: { key: "drupal", label: "Drupal", guideUrl: `${GUIDE_BASE}/drupal` } },
  { pattern: /content="Joomla/i, platform: { key: "joomla", label: "Joomla", guideUrl: `${GUIDE_BASE}/joomla` } },
];

export function platformForKey(key: string | null | undefined): PlatformInfo | null {
  if (!key) return null;
  return PLATFORM_MARKERS.find(m => m.platform.key === key)?.platform ?? null;
}

const MAX_BODY_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

const V4_MAPPED = new Address6("::ffff:0:0/96");
const NAT64 = new Address6("64:ff9b::/96");

/**
 * SSRF guard: reject any address that is not publicly routable. Delegates to
 * the favicon fetcher's allowlist (public v4, global-unicast v6). v4-mapped
 * and NAT64 addresses are judged by their embedded v4 address in every
 * spelling: URL parsing turns [::ffff:169.254.169.254] into
 * [::ffff:a9fe:a9fe], which a dotted-form pattern never matched.
 */
export function isPublicUnicastAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const ip = new Address6(address);
    if (ip.isInSubnet(V4_MAPPED) || ip.isInSubnet(NAT64)) {
      return isPublicHttpAddress(ip.to4().correctForm());
    }
  }
  return isPublicHttpAddress(address);
}

/** Resolve a hostname and confirm every address it maps to is public. */
async function isSafeTarget(url: URL): Promise<boolean> {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicUnicastAddress(host);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(a => isPublicUnicastAddress(a.address));
  } catch {
    return false;
  }
}

async function readBody(response: Response): Promise<string | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
  }
  reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Fetch a site's homepage HTML. Returns null when the site is unreachable.
 * Shared by platform fingerprinting and the install checker.
 *
 * Every hop (initial and each redirect) is validated against the SSRF guard
 * before it is fetched, redirects are followed manually with a hop cap, only
 * http/https on default ports are allowed, and the body read is size-capped.
 * (DNS is re-resolved by fetch after validation, so a fast-rebinding attacker
 * retains a narrow TOCTOU window; combined with the response never being
 * echoed back raw, the primitive is reduced to a coarse reachability oracle.)
 */
export async function fetchHomepage(domain: string): Promise<string | null> {
  // A site "domain" must be a bare hostname - anything else is refused outright.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) return null;

  for (const scheme of ["https", "http"]) {
    let url: URL;
    try {
      url = new URL(`${scheme}://${domain}/`);
    } catch {
      return null;
    }

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!(await isSafeTarget(url))) {
        logger.debug({ domain, target: url.href }, "Blocked non-public fetch target");
        break;
      }
      let response: Response;
      try {
        response = await fetch(url, {
          redirect: "manual",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RybbitSetupCheck/1.0; +https://rybbit.com)",
            Accept: "text/html",
          },
        });
      } catch (error) {
        logger.debug({ domain, scheme, err: error }, "Homepage fetch failed");
        break;
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        response.body?.cancel().catch(() => {});
        if (!location) break;
        try {
          url = new URL(location, url);
        } catch {
          break;
        }
        continue;
      }

      if (!response.ok) break;
      return await readBody(response);
    }
  }
  return null;
}

export function detectPlatformFromHtml(html: string): PlatformInfo | null {
  return PLATFORM_MARKERS.find(m => m.pattern.test(html))?.platform ?? null;
}

export async function detectPlatform(domain: string): Promise<PlatformInfo | null> {
  const html = await fetchHomepage(domain);
  if (!html) return null;
  return detectPlatformFromHtml(html);
}

/**
 * Whether the fetched homepage loads the Rybbit tracking script *for this
 * site*: a script reference plus a matching data-site-id, so a leftover
 * snippet for a different site doesn't report success.
 */
export function hasRybbitScript(html: string, siteId: number): boolean {
  if (!/api\/script\.js|rybbit\.js/i.test(html)) return false;
  return new RegExp(`data-site-id=["']?${siteId}["'\\s>]`, "i").test(html);
}
