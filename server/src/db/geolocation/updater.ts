import { createHash } from "crypto";
import { readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import { Reader } from "@maxmind/geoip2-node";
import { createServiceLogger } from "../../lib/logger/logger.js";

/**
 * Keeps the bundled GeoLite2 databases fresh without a MaxMind account.
 *
 * A scheduled GitHub Action (.github/workflows/geolite-mirror.yml) downloads
 * the databases with the project's MaxMind key and publishes them, plus a
 * manifest of sha256 hashes, as assets on a rolling GitHub release. Every
 * installation then pulls from that public mirror: check the manifest once a
 * day, download only what changed, verify the hash, open it to make sure it is
 * a usable database, write it next to the bundled copy, and swap the in-memory
 * reader. Self-hosters can point at their own mirror or opt out entirely.
 *
 * Nothing here is on the ingestion path: a failed check just logs and the
 * previously loaded database keeps serving.
 */

export const GEOIP_DB_FILES = ["GeoLite2-City.mmdb", "GeoLite2-ASN.mmdb"] as const;
export type GeoIpDbFile = (typeof GEOIP_DB_FILES)[number];

export const DEFAULT_GEOIP_MIRROR_URL = "https://github.com/rybbit-io/rybbit/releases/download/geolite";

export interface GeoIpManifestEntry {
  sha256: string;
  bytes: number;
}

export interface GeoIpManifest {
  updatedAt?: string;
  files: Partial<Record<GeoIpDbFile, GeoIpManifestEntry>>;
}

export interface GeoIpUpdaterOptions {
  /** Base URL that serves `manifest.json` and the `.mmdb` files. */
  mirrorUrl?: string;
  /** Directory the databases live in; defaults to the working directory like the readers. */
  dataDir?: string;
  /** In-process reload hooks. Omitted in the cluster primary, which only writes files. */
  apply?: Partial<Record<GeoIpDbFile, (buffer: Buffer) => Promise<void>>>;
  /** Called after a database has been written to disk, e.g. to tell cluster workers to reload. */
  onUpdated?: (file: GeoIpDbFile) => void;
  checkIntervalMs?: number;
  initialDelayMs?: number;
  fetchImpl?: typeof fetch;
}

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 30 * 1000;
const MANIFEST_TIMEOUT_MS = 15 * 1000;
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_DB_BYTES = 512 * 1024 * 1024;

const logger = createServiceLogger("geoip-updater");

export function isGeoIpAutoUpdateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.GEOIP_AUTO_UPDATE?.trim().toLowerCase() !== "false";
}

export function resolveGeoIpMirrorUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.GEOIP_MIRROR_URL?.trim();
  return (configured || DEFAULT_GEOIP_MIRROR_URL).replace(/\/+$/, "");
}

export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function isDbFile(name: string): name is GeoIpDbFile {
  return (GEOIP_DB_FILES as readonly string[]).includes(name);
}

/** Validate an untrusted manifest body. Unknown files are dropped, malformed entries rejected. */
export function parseManifest(body: unknown): GeoIpManifest {
  if (!body || typeof body !== "object" || !("files" in body) || !body.files || typeof body.files !== "object") {
    throw new Error("manifest has no files object");
  }
  const files: GeoIpManifest["files"] = {};
  for (const [name, raw] of Object.entries(body.files as Record<string, unknown>)) {
    if (!isDbFile(name)) continue;
    if (!raw || typeof raw !== "object") throw new Error(`manifest entry for ${name} is not an object`);
    const { sha256: hash, bytes } = raw as Record<string, unknown>;
    if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
      throw new Error(`manifest entry for ${name} has an invalid sha256`);
    }
    if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_DB_BYTES) {
      throw new Error(`manifest entry for ${name} has an invalid size`);
    }
    files[name] = { sha256: hash, bytes };
  }
  const updatedAt = (body as { updatedAt?: unknown }).updatedAt;
  return { files, updatedAt: typeof updatedAt === "string" ? updatedAt : undefined };
}

/** Which files the manifest says are newer than what we have. */
export function planUpdates(
  manifest: GeoIpManifest,
  current: Partial<Record<GeoIpDbFile, string | null>>
): GeoIpDbFile[] {
  return GEOIP_DB_FILES.filter(file => {
    const entry = manifest.files[file];
    return entry !== undefined && entry.sha256 !== current[file];
  });
}

/**
 * Open the buffer and run one lookup so a truncated, corrupt, or wrong-edition
 * file is rejected before it replaces a working database.
 */
export function assertUsableDatabase(file: GeoIpDbFile, buffer: Buffer): void {
  const reader = Reader.openBuffer(buffer);
  const probe = "8.8.8.8";
  if (file === "GeoLite2-City.mmdb") {
    if (!reader.city(probe).country?.isoCode) throw new Error("City probe lookup returned no country");
  } else {
    if (typeof reader.asn(probe).autonomousSystemNumber !== "number") {
      throw new Error("ASN probe lookup returned no ASN");
    }
  }
}

async function fileSha256(filePath: string): Promise<string | null> {
  try {
    return sha256(await readFile(filePath));
  } catch {
    return null;
  }
}

async function fetchWithTimeout(fetchImpl: typeof fetch, url: string, timeoutMs: number): Promise<Response> {
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
    cache: "no-store",
    headers: { "user-agent": "rybbit-geoip-updater" },
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res;
}

/** Write to a sibling temp file and rename so readers never see a partial database. */
async function writeAtomically(filePath: string, buffer: Buffer): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  try {
    await writeFile(tmpPath, buffer);
    await rename(tmpPath, filePath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
}

export class GeoIpUpdater {
  private readonly mirrorUrl: string;
  private readonly dataDir: string;
  private readonly apply: NonNullable<GeoIpUpdaterOptions["apply"]>;
  private readonly onUpdated?: (file: GeoIpDbFile) => void;
  private readonly checkIntervalMs: number;
  private readonly initialDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  /** sha256 of the database each file currently holds, `null` when the file is absent. */
  private current: Partial<Record<GeoIpDbFile, string | null>> = {};
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(options: GeoIpUpdaterOptions = {}) {
    this.mirrorUrl = (options.mirrorUrl ?? resolveGeoIpMirrorUrl()).replace(/\/+$/, "");
    this.dataDir = options.dataDir ?? process.cwd();
    this.apply = options.apply ?? {};
    this.onUpdated = options.onUpdated;
    this.checkIntervalMs = options.checkIntervalMs ?? CHECK_INTERVAL_MS;
    this.initialDelayMs = options.initialDelayMs ?? INITIAL_DELAY_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  start(): void {
    if (this.timer) return;
    logger.info({ mirrorUrl: this.mirrorUrl }, "GeoIP auto-update enabled");
    const first = setTimeout(() => {
      void this.check();
      this.timer = setInterval(() => void this.check(), this.checkIntervalMs);
      this.timer.unref();
    }, this.initialDelayMs);
    first.unref();
    this.timer = first;
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Check the mirror once. Concurrent calls share the same run. */
  check(): Promise<void> {
    if (!this.inFlight) {
      this.inFlight = this.run().finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  private async run(): Promise<void> {
    let manifest: GeoIpManifest;
    try {
      const res = await fetchWithTimeout(this.fetchImpl, `${this.mirrorUrl}/manifest.json`, MANIFEST_TIMEOUT_MS);
      manifest = parseManifest(await res.json());
    } catch (err) {
      logger.warn({ err, mirrorUrl: this.mirrorUrl }, "GeoIP update check failed — keeping current databases");
      return;
    }

    // Hash what's on disk lazily so a database another process already wrote
    // (or a fresh image) is recognised without a download.
    for (const file of GEOIP_DB_FILES) {
      if (this.current[file] === undefined) {
        this.current[file] = await fileSha256(path.join(this.dataDir, file));
      }
    }

    const stale = planUpdates(manifest, this.current);
    if (stale.length === 0) {
      logger.debug({ updatedAt: manifest.updatedAt }, "GeoIP databases are up to date");
      return;
    }

    for (const file of stale) {
      const entry = manifest.files[file]!;
      try {
        await this.update(file, entry);
      } catch (err) {
        logger.warn({ err, file }, "GeoIP database update failed — keeping current database");
      }
    }
  }

  private async update(file: GeoIpDbFile, entry: GeoIpManifestEntry): Promise<void> {
    const filePath = path.join(this.dataDir, file);

    // Another process may have finished this download since we last hashed the file.
    const onDisk = await fileSha256(filePath);
    let buffer: Buffer;
    if (onDisk === entry.sha256) {
      buffer = await readFile(filePath);
    } else {
      const res = await fetchWithTimeout(this.fetchImpl, `${this.mirrorUrl}/${file}`, DOWNLOAD_TIMEOUT_MS);
      buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length !== entry.bytes) {
        throw new Error(`downloaded ${buffer.length} bytes, manifest says ${entry.bytes}`);
      }
      const actual = sha256(buffer);
      if (actual !== entry.sha256) {
        throw new Error(`sha256 mismatch: downloaded ${actual}, manifest says ${entry.sha256}`);
      }
      assertUsableDatabase(file, buffer);
      try {
        await writeAtomically(filePath, buffer);
      } catch (err) {
        // Read-only filesystem: still usable in this process, but restarts and
        // cluster workers fall back to whatever is on disk.
        logger.warn({ err, filePath }, "Could not persist GeoIP database to disk");
      }
    }

    await this.apply[file]?.(buffer);
    this.current[file] = entry.sha256;
    this.onUpdated?.(file);
    logger.info({ file, sha256: entry.sha256, bytes: entry.bytes }, "GeoIP database updated");
  }
}

let updater: GeoIpUpdater | null = null;

/** Start the singleton updater if auto-update is enabled. Safe to call more than once. */
export function startGeoIpUpdater(options: GeoIpUpdaterOptions = {}): GeoIpUpdater | null {
  if (!isGeoIpAutoUpdateEnabled()) {
    logger.info("GeoIP auto-update disabled (GEOIP_AUTO_UPDATE=false)");
    return null;
  }
  if (!updater) {
    updater = new GeoIpUpdater(options);
    updater.start();
  }
  return updater;
}

export function stopGeoIpUpdater(): void {
  updater?.stop();
  updater = null;
}
