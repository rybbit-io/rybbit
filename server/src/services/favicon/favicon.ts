import { fetchPublicHttp } from "../../lib/publicHttpFetch.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("favicon");
const CACHE_MS = 60 * 60 * 1000;
const FAILURE_CACHE_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 128;
const MAX_ICON_BYTES = 256 * 1024;

interface Icon {
  body: Buffer;
  contentType: string;
}
interface CacheEntry {
  icon: Icon | null;
  expiresAt: number;
}

export function normalizeFaviconDomain(domain: unknown): string | null {
  if (typeof domain !== "string") return null;
  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  if (normalized.length > 253 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(normalized))
    return null;
  return normalized.split(".").every(label => label.length <= 63) ? normalized : null;
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4]).replace(/&amp;/gi, "&");
  }
  return result;
}

function iconUrls(html: string, pageUrl: URL): URL[] {
  const markup = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  let base = pageUrl;
  const baseTag = markup.match(/<base\b(?:[^>"']|"[^"]*"|'[^']*')*>/i)?.[0];
  if (baseTag) {
    try {
      base = new URL(attributes(baseTag).href, pageUrl);
    } catch {
      /* Ignore an invalid base. */
    }
  }
  const icons: URL[] = [];
  const touchIcons: URL[] = [];
  for (const match of markup.matchAll(/<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const attrs = attributes(match[0]);
    const rel = attrs.rel?.toLowerCase().split(/\s+/) ?? [];
    if (!attrs.href || !rel.some(value => value === "icon" || value === "apple-touch-icon")) continue;
    try {
      const url = new URL(attrs.href, base);
      if (url.protocol === "http:" || url.protocol === "https:") {
        (rel.includes("icon") ? icons : touchIcons).push(url);
      }
    } catch {
      /* Ignore malformed icon URLs. */
    }
  }
  // The last declared standard icon takes precedence; try at most three
  // declared icons before the conventional fallback to bound network work.
  return [...icons.reverse(), ...touchIcons.reverse()].slice(0, 3).concat(new URL("/favicon.ico", pageUrl));
}

function imageContentType(body: Buffer): string | null {
  if (body.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
  if (body.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))) return "image/x-icon";
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (/^GIF8[79]a$/.test(body.subarray(0, 6).toString())) return "image/gif";
  if (body.subarray(0, 4).toString() === "RIFF" && body.subarray(8, 12).toString() === "WEBP") return "image/webp";
  const text = body
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i.test(text)) return "image/svg+xml";
  return null;
}

export class FaviconService {
  private cache = new Map<string, CacheEntry>();
  private pending = new Map<string, Promise<CacheEntry>>();
  private active = 0;
  private waiting: Array<() => void> = [];

  async get(domain: string): Promise<CacheEntry> {
    const cached = this.cache.get(domain);
    if (cached && cached.expiresAt > Date.now()) return cached;
    const pending = this.pending.get(domain);
    if (pending) return pending;
    if (this.pending.size >= MAX_CACHE_ENTRIES) return { icon: null, expiresAt: Date.now() };

    const task = this.loadQueued(domain)
      .then(icon => {
        const entry = { icon, expiresAt: Date.now() + (icon ? CACHE_MS : FAILURE_CACHE_MS) };
        this.cache.delete(domain);
        if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(domain, entry);
        return entry;
      })
      .finally(() => this.pending.delete(domain));
    this.pending.set(domain, task);
    return task;
  }

  private async loadQueued(domain: string): Promise<Icon | null> {
    if (this.active >= 20) await new Promise<void>(resolve => this.waiting.push(resolve));
    else this.active++;
    try {
      return await this.load(domain);
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }

  private async load(domain: string): Promise<Icon | null> {
    const signal = AbortSignal.timeout(10_000);
    let pageUrl = new URL(`https://${domain}/`);
    let html = "";
    for (const scheme of ["https:", "http:"]) {
      pageUrl = new URL(`${scheme}//${domain}/`);
      try {
        const page = await fetchPublicHttp(pageUrl, { signal, maxBytes: 1024 * 1024 });
        pageUrl = page.url;
        if (page.status === 200) html = page.body.toString("utf8");
        break;
      } catch (err) {
        logger.debug({ domain, err }, "Favicon homepage fetch failed");
      }
    }
    for (const url of iconUrls(html, pageUrl)) {
      try {
        const response = await fetchPublicHttp(url, { signal, maxBytes: MAX_ICON_BYTES });
        if (response.status !== 200) continue;
        const contentType = imageContentType(response.body);
        if (contentType) return { body: response.body, contentType };
      } catch (err) {
        logger.debug({ domain, err }, "Favicon image fetch failed");
      }
    }
    return null;
  }
}

export const faviconService = new FaviconService();
