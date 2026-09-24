import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan", ".test", ".invalid"];
const MAX_REDIRECTS = 3;

export const MAX_PUBLIC_RESPONSE_BYTES = 1_000_000;

export class PublicUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicUrlError";
  }
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export interface PublicTextResponse {
  body: string;
  finalUrl: string;
  headers: IncomingHttpHeaders;
  redirectCount: number;
  statusCode: number;
}

function ipv4ToNumber(address: string): number | null {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return (((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0;
}

function isIpv4Range(address: string, network: string, prefix: number): boolean {
  const value = ipv4ToNumber(address);
  const base = ipv4ToNumber(network);
  if (value === null || base === null) return true;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

function parseIpv6(address: string): number[] | null {
  let normalized = address.toLowerCase().split("%")[0];
  const embeddedIpv4 = normalized.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (embeddedIpv4) {
    const value = ipv4ToNumber(embeddedIpv4);
    if (value === null) return null;
    normalized =
      normalized.slice(0, -embeddedIpv4.length) + `${(value >>> 16).toString(16)}:${(value & 0xffff).toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;

  const groups = [...left, ...Array(missing).fill("0"), ...right].map(group => Number.parseInt(group || "0", 16));
  if (groups.length !== 8 || groups.some(group => !Number.isInteger(group) || group < 0 || group > 0xffff)) {
    return null;
  }
  return groups;
}

function isPrivateOrReservedIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([network, prefix]) => isIpv4Range(address, network as string, prefix as number));
  }

  if (family === 6) {
    const groups = parseIpv6(address);
    if (!groups) return true;
    const allZero = groups.every(group => group === 0);
    const loopback = groups.slice(0, 7).every(group => group === 0) && groups[7] === 1;
    const mappedIpv4 = groups.slice(0, 5).every(group => group === 0) && groups[5] === 0xffff;
    const compatibleIpv4 = groups.slice(0, 6).every(group => group === 0);
    if (mappedIpv4) {
      const mapped = `${groups[6] >>> 8}.${groups[6] & 255}.${groups[7] >>> 8}.${groups[7] & 255}`;
      return isPrivateOrReservedIp(mapped);
    }
    if (compatibleIpv4) {
      const compatible = `${groups[6] >>> 8}.${groups[6] & 255}.${groups[7] >>> 8}.${groups[7] & 255}`;
      return isPrivateOrReservedIp(compatible);
    }

    return (
      allZero ||
      loopback ||
      (groups[0] & 0xfe00) === 0xfc00 ||
      (groups[0] & 0xffc0) === 0xfe80 ||
      (groups[0] & 0xffc0) === 0xfec0 ||
      (groups[0] & 0xff00) === 0xff00 ||
      (groups[0] === 0x0064 && groups[1] === 0xff9b) ||
      (groups[0] === 0x2001 && groups[1] === 0x0000) ||
      (groups[0] === 0x2001 && groups[1] === 0x0db8) ||
      (groups[0] === 0x2001 && (groups[1] & 0xfff0) === 0x0010)
    );
  }

  return true;
}

export async function validatePublicHttpUrl(input: string): Promise<{ url: URL; addresses: ResolvedAddress[] }> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new PublicUrlError("Enter a complete URL beginning with http:// or https://.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PublicUrlError("Only public HTTP and HTTPS URLs can be checked.");
  }
  if (url.username || url.password) {
    throw new PublicUrlError("URLs containing credentials are not supported.");
  }
  if (
    url.port &&
    !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))
  ) {
    throw new PublicUrlError("Only standard web ports (80 and 443) can be checked.");
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^\[(.*)\]$/, "$1");
  if (
    hostname === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix)) ||
    hostname.length === 0
  ) {
    throw new PublicUrlError("Local and internal network addresses cannot be checked.");
  }

  let addresses: ResolvedAddress[];
  if (isIP(hostname)) {
    addresses = [{ address: hostname, family: isIP(hostname) as 4 | 6 }];
  } else {
    try {
      const resolved = await lookup(hostname, { all: true, verbatim: true });
      addresses = resolved.map(({ address, family }) => ({ address, family: family as 4 | 6 }));
    } catch {
      throw new PublicUrlError("That hostname could not be resolved.");
    }
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new PublicUrlError("Local, private, and reserved network addresses cannot be checked.");
  }

  url.hash = "";
  return { url, addresses };
}

function requestOnce(
  url: URL,
  addresses: ResolvedAddress[],
  timeoutMs: number,
  maxBytes: number
): Promise<{ body: string; headers: IncomingHttpHeaders; statusCode: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = <T>(callback: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(absoluteTimer);
      callback(value);
    };
    let nextAddress = 0;
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) {
        callback(null, addresses);
        return;
      }
      const selected = addresses[nextAddress++ % addresses.length];
      callback(null, selected.address, selected.family);
    };

    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5",
        "Accept-Encoding": "identity",
        "User-Agent": "RybbitToolScanner/1.0 (+https://rybbit.com/tools)",
      },
      lookup: pinnedLookup,
      method: "GET",
    });

    const absoluteTimer = setTimeout(
      () => request.destroy(new PublicUrlError("The website took too long to respond.")),
      timeoutMs
    );
    request.setTimeout(timeoutMs, () => request.destroy(new PublicUrlError("The website took too long to respond.")));
    request.on("error", error => settle(reject, error));
    request.on("response", response => {
      const contentLength = Number(response.headers["content-length"] || 0);
      if (contentLength > maxBytes) {
        response.destroy(new PublicUrlError("The response is too large to scan safely."));
        return;
      }

      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          response.destroy(new PublicUrlError("The response is too large to scan safely."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", error => settle(reject, error));
      response.on("end", () => {
        settle(resolve, {
          body: Buffer.concat(chunks).toString("utf8"),
          headers: response.headers,
          statusCode: response.statusCode || 0,
        });
      });
    });
    request.end();
  });
}

export async function fetchPublicText(
  input: string,
  options: { maxBytes?: number; timeoutMs?: number } = {}
): Promise<PublicTextResponse> {
  const maxBytes = options.maxBytes ?? MAX_PUBLIC_RESPONSE_BYTES;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const deadline = Date.now() + timeoutMs;
  let current = input;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const { url, addresses } = await validatePublicHttpUrl(current);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new PublicUrlError("The website took too long to respond.");

    const response = await requestOnce(url, addresses, remaining, maxBytes);
    const location = response.headers.location;
    if (response.statusCode >= 300 && response.statusCode < 400 && location) {
      if (redirectCount === MAX_REDIRECTS) throw new PublicUrlError("The website redirected too many times.");
      current = new URL(location, url).toString();
      continue;
    }

    return {
      ...response,
      finalUrl: url.toString(),
      redirectCount,
    };
  }

  throw new PublicUrlError("The website redirected too many times.");
}
