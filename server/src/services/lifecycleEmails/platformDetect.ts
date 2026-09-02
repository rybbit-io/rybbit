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

/**
 * Fetch a site's homepage HTML. Returns null when the site is unreachable.
 * Shared by platform fingerprinting and the install checker.
 */
export async function fetchHomepage(domain: string): Promise<string | null> {
  for (const scheme of ["https", "http"]) {
    try {
      const response = await fetch(`${scheme}://${domain}/`, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RybbitSetupCheck/1.0; +https://rybbit.com)",
          Accept: "text/html",
        },
      });
      if (!response.ok || !response.body) continue;

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
    } catch (error) {
      logger.debug({ domain, scheme, err: error }, "Homepage fetch failed");
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

/** Whether the fetched homepage already loads the Rybbit tracking script. */
export function hasRybbitScript(html: string): boolean {
  return /data-site-id|rybbit/i.test(html) && /api\/script\.js|rybbit\.js/i.test(html);
}
