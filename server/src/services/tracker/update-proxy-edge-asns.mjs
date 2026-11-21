import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Additive refresh of proxyEdgeAsns.ts: every network already trusted stays
 * trusted, and hosting networks new to the upstream list are added.
 *
 * It never removes. Dropping a network a customer's proxy runs on makes
 * `resolveClientIp` stop trusting that proxy's forwarded headers, and every
 * visitor to their site becomes the proxy. To drop one on purpose, delete it
 * from the generated file by hand, in a change that says why.
 */

const SOURCE_URL =
  process.env.IPVERSE_AS_METADATA_URL ?? "https://raw.githubusercontent.com/ipverse/as-metadata/master/as.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = process.env.PROXY_EDGE_ASNS_OUTPUT ?? path.resolve(__dirname, "proxyEdgeAsns.ts");
const currentPath = path.resolve(__dirname, "proxyEdgeAsns.ts");

async function loadSource() {
  const localPath = process.argv[2];
  if (localPath) {
    return JSON.parse(await readFile(localPath, "utf8"));
  }

  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function hostingAsns(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("Expected ipverse AS metadata to be a JSON array");
  }

  const asns = new Set();
  for (const entry of entries) {
    const asn = entry?.asn;
    if (Number.isInteger(asn) && asn > 0 && entry?.metadata?.category === "hosting") {
      asns.add(asn);
    }
  }
  return asns;
}

async function currentAsns() {
  const file = await readFile(currentPath, "utf8");
  const start = file.indexOf("const PROXY_EDGE_ASN_LIST");
  const end = file.indexOf("];", start);
  if (start === -1 || end === -1) {
    throw new Error(`Could not find PROXY_EDGE_ASN_LIST in ${currentPath}`);
  }
  const body = file.slice(file.indexOf("[", start) + 1, end);
  return new Set((body.match(/\d+/g) ?? []).map(Number));
}

function formatAsnList(asns) {
  const lines = [];
  for (let i = 0; i < asns.length; i += 14) {
    lines.push(`  ${asns.slice(i, i + 14).join(", ")},`);
  }
  return lines.join("\n");
}

export function render(asns, updatedAt) {
  return `/**
 * Networks a first-party proxy can sit on — the list \`resolveClientIp\` reads to
 * decide whether \`CF-Connecting-IP\` is a customer's proxy (trust the forwarded
 * visitor IP) or the visitor (ignore forwarded headers).
 *
 * This is deliberately NOT the bot-detection hosting list in
 * botBlocking/datacenterAsns.ts, although it began as a copy of it (the
 * 2026-08-07 generation). The two answer different questions and fail
 * differently. Regenerating the hosting list drops and adds thousands of
 * networks at a time, which is fine for a bot signal and is not fine here:
 * dropping the network a customer's proxy runs on turns every visitor to their
 * site into the proxy's address. So this list only ever grows.
 *
 * Maintained by server/src/services/tracker/update-proxy-edge-asns.mjs, which
 * adds hosting networks new to ipverse/as-metadata and never removes one:
 *   npm run update:proxy-edge-asns
 *
 * Last updated: ${updatedAt}
 */

const PROXY_EDGE_ASN_LIST: readonly number[] = [
${formatAsnList(asns)}
];

export const PROXY_EDGE_ASN_COUNT = PROXY_EDGE_ASN_LIST.length;

const PROXY_EDGE_ASNS: ReadonlySet<number> = new Set(PROXY_EDGE_ASN_LIST);

export function isProxyEdgeAsn(asn: number | null | undefined): boolean {
  return typeof asn === "number" && PROXY_EDGE_ASNS.has(asn);
}
`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const current = await currentAsns();
  const upstream = hostingAsns(await loadSource());
  if (upstream.size < 1000) {
    throw new Error(`Refusing to read a suspiciously small upstream list (${upstream.size} entries)`);
  }

  const merged = [...new Set([...current, ...upstream])].sort((a, b) => a - b);
  const added = merged.length - current.size;
  if (added === 0) {
    console.log(`No new hosting networks; ${current.size} proxy-edge ASNs unchanged`);
  } else {
    await writeFile(outputPath, render(merged, new Date().toISOString().slice(0, 10)));
    console.log(`Added ${added} hosting ASNs (${merged.length} total) to ${path.relative(process.cwd(), outputPath)}`);
  }
}
