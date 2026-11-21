import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Subdivisions } from "./geoStore";

const publicDir = join(__dirname, "../../public");

const regionNames = new Map([["CN-HA", "Henan Sheng"]]);

// The store keeps in-flight loads in module state, so each test gets a fresh copy of the module.
async function loadStore() {
  vi.resetModules();
  return (await import("./geoStore")).useGeoStore;
}

const okResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getRegionName", () => {
  it("returns an empty string when the region is missing", async () => {
    const useGeoStore = await loadStore();
    useGeoStore.setState({ regionNames: new Map([["", "Azerbaijan"], ...regionNames]) });

    expect(useGeoStore.getState().getRegionName("")).toBe("");
  });

  it("returns a matching region name", async () => {
    const useGeoStore = await loadStore();
    useGeoStore.setState({ regionNames });

    expect(useGeoStore.getState().getRegionName("CN-HA")).toBe("Henan Sheng");
  });

  it("returns an empty string for an unknown region or before the names load", async () => {
    const useGeoStore = await loadStore();
    expect(useGeoStore.getState().getRegionName("CN-HA")).toBe("");

    useGeoStore.setState({ regionNames });
    expect(useGeoStore.getState().getRegionName("XX-NOTREAL")).toBe("");
  });
});

describe("loading", () => {
  it("fetches nothing on import", async () => {
    await loadStore();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares one request between concurrent callers and skips loaded data", async () => {
    const useGeoStore = await loadStore();
    fetchMock.mockResolvedValue(okResponse({ "CN-HA": "Henan Sheng" }));

    await Promise.all([useGeoStore.getState().fetchRegionNames(), useGeoStore.getState().fetchRegionNames()]);
    await useGeoStore.getState().fetchRegionNames();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/subdivision-names.generated.json");
    expect(useGeoStore.getState().getRegionName("CN-HA")).toBe("Henan Sheng");
  });

  it("loads region names without the geometry", async () => {
    const useGeoStore = await loadStore();
    fetchMock.mockResolvedValue(okResponse({}));

    await useGeoStore.getState().fetchRegionNames();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/subdivision-names.generated.json"]);
    expect(useGeoStore.getState().subdivisions).toBeNull();
    expect(useGeoStore.getState().countries).toBeNull();
  });

  it("records a failed load and retries it on the next call", async () => {
    const useGeoStore = await loadStore();
    fetchMock.mockResolvedValueOnce({ ok: false } as Response);

    await useGeoStore.getState().fetchCountries();
    expect(useGeoStore.getState().countriesError).toBe("Failed to fetch countries");
    expect(useGeoStore.getState().countries).toBeNull();

    const countries = { type: "FeatureCollection", features: [] };
    fetchMock.mockResolvedValueOnce(okResponse(countries));
    await useGeoStore.getState().fetchCountries();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useGeoStore.getState().countriesError).toBeNull();
    expect(useGeoStore.getState().countries).toEqual(countries);
  });
});

describe("subdivision-names.generated.json", () => {
  it("matches the first feature for each code in subdivisions.json", () => {
    const subdivisions: Subdivisions = JSON.parse(readFileSync(join(publicDir, "subdivisions.json"), "utf8"));
    const names: Record<string, string> = JSON.parse(
      readFileSync(join(publicDir, "subdivision-names.generated.json"), "utf8")
    );

    const expected = new Map<string, string>();
    for (const { properties } of subdivisions.features) {
      if (properties.iso_3166_2 && !expected.has(properties.iso_3166_2)) {
        expected.set(properties.iso_3166_2, properties.name);
      }
    }

    // Out of date: run `node scripts/generate-subdivision-names.mjs` from client/.
    expect(names).toEqual(Object.fromEntries(expected));
  });
});
