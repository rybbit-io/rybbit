import { Address4, Address6 } from "ip-address";
import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const BLOCKED_V4 = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/3",
].map(cidr => new Address4(cidr));
const GLOBAL_V6 = new Address6("2000::/3");
const BLOCKED_V6 = ["2001::/23", "2001:db8::/32", "2002::/16", "3fff::/20"].map(cidr => new Address6(cidr));

export function isPublicHttpAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const ip = new Address4(address);
    return !BLOCKED_V4.some(range => ip.isInSubnet(range));
  }
  if (isIP(address) === 6) {
    const ip = new Address6(address);
    return ip.isInSubnet(GLOBAL_V6) && !BLOCKED_V6.some(range => ip.isInSubnet(range));
  }
  return false;
}

export interface PublicHttpResponse {
  body: Buffer;
  headers: IncomingHttpHeaders;
  status: number;
  url: URL;
}

// Resolve once and pin the connection to those addresses, including every
// redirect. A separate validation followed by fetch would allow DNS rebinding.
export async function fetchPublicHttp(
  input: URL,
  { signal, maxBytes }: { signal: AbortSignal; maxBytes: number }
): Promise<PublicHttpResponse> {
  let url = input;
  for (let hop = 0; hop <= 3; hop++) {
    signal.throwIfAborted();
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
      throw new Error("Only public HTTP(S) URLs on standard ports are allowed");
    }
    const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if ((!host.includes(".") && !isIP(host)) || /\.(localhost|local|internal|home|lan|test|invalid)$/i.test(host)) {
      throw new Error("Internal hostnames are not allowed");
    }
    const addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
          const abort = () => reject(signal.reason);
          signal.addEventListener("abort", abort, { once: true });
          lookup(host, { all: true, verbatim: true })
            .then(resolve, reject)
            .finally(() => signal.removeEventListener("abort", abort));
        });
    signal.throwIfAborted();
    if (!addresses.length || addresses.some(({ address }) => !isPublicHttpAddress(address))) {
      throw new Error("Non-public addresses are not allowed");
    }
    const pinnedLookup: LookupFunction = (_host, options, callback) => {
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    };
    const response = await new Promise<PublicHttpResponse>((resolve, reject) => {
      const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          agent: false,
          lookup: pinnedLookup,
          signal,
          headers: {
            Accept: "text/html,image/*;q=0.9,*/*;q=0.1",
            "Accept-Encoding": "identity",
            "Cache-Control": "no-cache",
            "User-Agent": "RybbitFavicon/1.0 (+https://rybbit.com)",
          },
        },
        res => {
          res.on("error", reject);
          if (Number(res.headers["content-length"]) > maxBytes) {
            res.destroy(new Error("Response too large"));
            return;
          }
          if ((res.statusCode ?? 0) >= 300 && (res.statusCode ?? 0) < 400) {
            res.destroy();
            resolve({ body: Buffer.alloc(0), headers: res.headers, status: res.statusCode!, url });
            return;
          }
          let bytes = 0;
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > maxBytes) res.destroy(new Error("Response too large"));
            else chunks.push(chunk);
          });
          res.on("end", () =>
            resolve({ body: Buffer.concat(chunks), headers: res.headers, status: res.statusCode ?? 0, url })
          );
        }
      );
      req.on("error", reject);
      req.end();
    });
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      url = new URL(response.headers.location, url);
      continue;
    }
    return response;
  }
  throw new Error("Too many redirects");
}
