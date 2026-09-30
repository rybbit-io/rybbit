import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { Address6 } from "ip-address";
import { JSDOM } from "jsdom";
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

/**
 * SSRF guard: reject any address that is not publicly routable. Covers
 * loopback, RFC1918, link-local (incl. cloud metadata 169.254.169.254),
 * CGNAT, benchmarking/documentation ranges, multicast/reserved, and their
 * IPv6 equivalents including v4-mapped forms.
 */
export function isPublicUnicastAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicV4(address);
  if (family === 6) {
    const parsed = new Address6(address);
    if (parsed.isMapped4()) return isPublicV4(parsed.to4().correctForm());
    const lower = parsed.correctForm().toLowerCase();
    if (!parsed.isInSubnet(new Address6("2000::/3"))) return false;
    // Reject translation/tunneling prefixes: routing can expose an embedded private v4.
    if (parsed.isInSubnet(new Address6("64:ff9b::/96")) ||
        parsed.isInSubnet(new Address6("64:ff9b:1::/48")) ||
        parsed.isInSubnet(new Address6("2002::/16")) ||
        parsed.isInSubnet(new Address6("2001::/32"))) return false;
    if (parsed.isInSubnet(new Address6("2001:db8::/32")) ||
        parsed.isInSubnet(new Address6("3fff::/20"))) return false; // documentation
    if (lower === "::" || lower === "::1") return false;
    if (/^(fc|fd)/.test(lower)) return false; // unique local fc00::/7
    if (/^fe[89ab]/.test(lower)) return false; // link-local fe80::/10
    if (/^ff/.test(lower)) return false; // multicast
    return true;
  }
  return false;
}

function isPublicV4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT 100.64/10
  if (a === 169 && b === 254) return false; // link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0) return false; // 192.0.0/24 + 192.0.2/24 (docs)
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51) return false; // 198.51.100/24 docs
  if (a === 203 && b === 113) return false; // 203.0.113/24 docs
  if (a >= 224) return false; // multicast + reserved + broadcast
  return true;
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

function fetchPublicTarget(url: URL): Promise<{ status: number; location?: string; body: string | null }> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      agent: false,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Validate the resolution actually handed to the socket, including every redirect.
      lookup: (hostname, options, callback) => {
        lookup(hostname, { all: true, verbatim: true }).then(addresses => {
          if (!addresses.length || addresses.some(address => !isPublicUnicastAddress(address.address))) {
            callback(new Error("Blocked non-public connection address"), "", 0);
            return;
          }
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        }, error => callback(error, "", 0));
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RybbitSetupCheck/1.0; +https://rybbit.com)",
        Accept: "text/html",
      },
    }, response => {
      const status = response.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        response.destroy();
        resolve({ status, location: response.headers.location, body: null });
        return;
      }
      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer) => {
        const remaining = MAX_BODY_BYTES - received;
        chunks.push(chunk.subarray(0, remaining));
        received += Math.min(chunk.length, remaining);
        if (received >= MAX_BODY_BYTES) {
          resolve({ status, body: Buffer.concat(chunks).toString("utf8") });
          response.destroy();
        }
      });
      response.on("end", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", () => resolve({ status, body: null }));
      response.on("aborted", () => resolve({ status, body: null }));
    });
    request.on("error", reject);
    request.end();
  });
}

/**
 * Fetch a site's homepage HTML. Returns null when the site is unreachable.
 * Shared by platform fingerprinting and the install checker.
 *
 * Every hop (initial and each redirect) is validated against the SSRF guard
 * before it is fetched, redirects are followed manually with a hop cap, only
 * http/https on default ports are allowed, and the body read is size-capped.
 * The request's socket lookup validates the address used by the connection,
 * so DNS rebinding cannot replace a checked public address with a private one.
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
      let response: Awaited<ReturnType<typeof fetchPublicTarget>>;
      try {
        response = await fetchPublicTarget(url);
      } catch (error) {
        logger.debug({ domain, scheme, err: error }, "Homepage fetch failed");
        break;
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.location;
        if (!location) break;
        try {
          url = new URL(location, url);
        } catch {
          break;
        }
        continue;
      }

      if (response.status < 200 || response.status >= 300) break;
      return response.body;
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
  const document = new JSDOM(html).window.document;
  return [...document.querySelectorAll("script[src]")].some(script =>
    /api\/script\.js|rybbit\.js/i.test(script.getAttribute("src") ?? "") && script.getAttribute("data-site-id") === String(siteId)
  );
}
