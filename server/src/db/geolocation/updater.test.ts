import { mkdtemp, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GeoIpUpdater,
  isGeoIpAutoUpdateEnabled,
  parseManifest,
  planUpdates,
  resolveGeoIpMirrorUrl,
  sha256,
  type GeoIpManifest,
} from "./updater.js";

// Real database bundled with the server; small enough to hash in tests.
const asnPath = path.join(process.cwd(), "GeoLite2-ASN.mmdb");
const mirror = "https://mirror.test/geolite";

function binaryResponse(buf: Buffer): Response {
  return new Response(new Uint8Array(buf), { status: 200, headers: { "content-type": "application/octet-stream" } });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function manifestFor(files: Record<string, Buffer>): GeoIpManifest {
  const entries = Object.entries(files).map(([name, buf]) => [name, { sha256: sha256(buf), bytes: buf.length }]);
  return { updatedAt: "2026-09-11T00:00:00Z", files: Object.fromEntries(entries) };
}

describe("config", () => {
  it("auto-update is on unless explicitly disabled", () => {
    expect(isGeoIpAutoUpdateEnabled({})).toBe(true);
    expect(isGeoIpAutoUpdateEnabled({ GEOIP_AUTO_UPDATE: "true" })).toBe(true);
    expect(isGeoIpAutoUpdateEnabled({ GEOIP_AUTO_UPDATE: "false" })).toBe(false);
    expect(isGeoIpAutoUpdateEnabled({ GEOIP_AUTO_UPDATE: " FALSE " })).toBe(false);
  });

  it("mirror URL falls back to the default and strips trailing slashes", () => {
    expect(resolveGeoIpMirrorUrl({})).toBe("https://github.com/rybbit-io/rybbit/releases/download/geolite");
    expect(resolveGeoIpMirrorUrl({ GEOIP_MIRROR_URL: "" })).toBe(
      "https://github.com/rybbit-io/rybbit/releases/download/geolite"
    );
    expect(resolveGeoIpMirrorUrl({ GEOIP_MIRROR_URL: "https://x.test/geo///" })).toBe("https://x.test/geo");
  });
});

describe("parseManifest", () => {
  const good = { sha256: "a".repeat(64), bytes: 10 };

  it("keeps known files and drops unknown ones", () => {
    const m = parseManifest({ updatedAt: "now", files: { "GeoLite2-City.mmdb": good, "evil.mmdb": good } });
    expect(m.files).toEqual({ "GeoLite2-City.mmdb": good });
    expect(m.updatedAt).toBe("now");
  });

  it("rejects malformed bodies", () => {
    expect(() => parseManifest(null)).toThrow();
    expect(() => parseManifest({})).toThrow();
    expect(() => parseManifest({ files: { "GeoLite2-City.mmdb": { sha256: "zz", bytes: 10 } } })).toThrow(/sha256/);
    expect(() => parseManifest({ files: { "GeoLite2-City.mmdb": { sha256: "a".repeat(64), bytes: 0 } } })).toThrow(
      /size/
    );
    expect(() => parseManifest({ files: { "GeoLite2-ASN.mmdb": "nope" } })).toThrow(/object/);
  });
});

describe("planUpdates", () => {
  it("returns only files whose hash differs from what we hold", () => {
    const manifest: GeoIpManifest = {
      files: {
        "GeoLite2-City.mmdb": { sha256: "a".repeat(64), bytes: 1 },
        "GeoLite2-ASN.mmdb": { sha256: "b".repeat(64), bytes: 1 },
      },
    };
    expect(planUpdates(manifest, { "GeoLite2-City.mmdb": "a".repeat(64), "GeoLite2-ASN.mmdb": null })).toEqual([
      "GeoLite2-ASN.mmdb",
    ]);
    expect(planUpdates({ files: {} }, {})).toEqual([]);
  });
});

describe("GeoIpUpdater.check", () => {
  let dataDir: string;
  let asnBuffer: Buffer;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "geoip-"));
    asnBuffer = await readFile(asnPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(routes: Record<string, () => Response>) {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const route = routes[url];
      if (!route) return new Response("not found", { status: 404 });
      return route();
    });
    return fetchImpl as unknown as typeof fetch & ReturnType<typeof vi.fn>;
  }

  it("downloads, verifies, persists and applies a changed database", async () => {
    const manifest = manifestFor({ "GeoLite2-ASN.mmdb": asnBuffer });
    const fetchImpl = mockFetch({
      [`${mirror}/manifest.json`]: () => jsonResponse(manifest),
      [`${mirror}/GeoLite2-ASN.mmdb`]: () => binaryResponse(asnBuffer),
    });
    const applied: Buffer[] = [];
    const updated: string[] = [];
    const updater = new GeoIpUpdater({
      mirrorUrl: mirror,
      dataDir,
      fetchImpl,
      apply: { "GeoLite2-ASN.mmdb": async buf => void applied.push(buf) },
      onUpdated: file => void updated.push(file),
    });

    await updater.check();

    expect(applied).toHaveLength(1);
    expect(sha256(applied[0])).toBe(sha256(asnBuffer));
    expect(updated).toEqual(["GeoLite2-ASN.mmdb"]);
    expect(sha256(await readFile(path.join(dataDir, "GeoLite2-ASN.mmdb")))).toBe(sha256(asnBuffer));

    // Second check: manifest unchanged, nothing downloaded again.
    fetchImpl.mockClear();
    await updater.check();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(applied).toHaveLength(1);
  });

  it("skips the download when the file on disk already matches the manifest", async () => {
    await writeFile(path.join(dataDir, "GeoLite2-ASN.mmdb"), asnBuffer);
    const fetchImpl = mockFetch({
      [`${mirror}/manifest.json`]: () => jsonResponse(manifestFor({ "GeoLite2-ASN.mmdb": asnBuffer })),
    });
    const apply = vi.fn(async () => {});
    const updater = new GeoIpUpdater({ mirrorUrl: mirror, dataDir, fetchImpl, apply: { "GeoLite2-ASN.mmdb": apply } });

    await updater.check();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it("rejects a download whose hash does not match the manifest", async () => {
    const manifest = manifestFor({ "GeoLite2-ASN.mmdb": asnBuffer });
    const tampered = Buffer.concat([asnBuffer.subarray(0, asnBuffer.length - 1), Buffer.from([0xff])]);
    const fetchImpl = mockFetch({
      [`${mirror}/manifest.json`]: () => jsonResponse(manifest),
      [`${mirror}/GeoLite2-ASN.mmdb`]: () => binaryResponse(tampered),
    });
    const apply = vi.fn(async () => {});
    const updater = new GeoIpUpdater({ mirrorUrl: mirror, dataDir, fetchImpl, apply: { "GeoLite2-ASN.mmdb": apply } });

    await updater.check();

    expect(apply).not.toHaveBeenCalled();
    await expect(readFile(path.join(dataDir, "GeoLite2-ASN.mmdb"))).rejects.toThrow();
  });

  it("rejects a file that hashes correctly but is not a usable database", async () => {
    const junk = Buffer.from("definitely not an mmdb file");
    const fetchImpl = mockFetch({
      [`${mirror}/manifest.json`]: () => jsonResponse(manifestFor({ "GeoLite2-ASN.mmdb": junk })),
      [`${mirror}/GeoLite2-ASN.mmdb`]: () => binaryResponse(junk),
    });
    const apply = vi.fn(async () => {});
    const updater = new GeoIpUpdater({ mirrorUrl: mirror, dataDir, fetchImpl, apply: { "GeoLite2-ASN.mmdb": apply } });

    await updater.check();

    expect(apply).not.toHaveBeenCalled();
  });

  it("rejects a City manifest entry that actually serves the ASN database", async () => {
    const fetchImpl = mockFetch({
      [`${mirror}/manifest.json`]: () => jsonResponse(manifestFor({ "GeoLite2-City.mmdb": asnBuffer })),
      [`${mirror}/GeoLite2-City.mmdb`]: () => binaryResponse(asnBuffer),
    });
    const apply = vi.fn(async () => {});
    const updater = new GeoIpUpdater({ mirrorUrl: mirror, dataDir, fetchImpl, apply: { "GeoLite2-City.mmdb": apply } });

    await updater.check();

    expect(apply).not.toHaveBeenCalled();
  });

  it("survives an unreachable mirror", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const updater = new GeoIpUpdater({ mirrorUrl: mirror, dataDir, fetchImpl });
    await expect(updater.check()).resolves.toBeUndefined();
  });
});
