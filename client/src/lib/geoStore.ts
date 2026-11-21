import { create } from "zustand";

// Map geometry: 10.6 MB and 15.1 MB. Only maps and the globe load these.
const countriesGeoUrl = "/countries.json";
const subdivisionsGeoUrl = "/subdivisions.json";
// Subdivision code → name, generated from subdivisions.json by scripts/generate-subdivision-names.mjs.
// Region labels (filters, sections, session details) load this instead of the geometry.
const subdivisionNamesUrl = "/subdivision-names.generated.json";

export type Subdivisions = {
  type: string;
  features: Array<{
    type: string;
    properties: {
      name: string;
      iso_3166_2: string;
      admin: string;
      border: number;
    };
    geometry: {
      type: string;
      coordinates: Array<Array<Array<any>>>;
    };
  }>;
};

export type Country = {
  type: string;
  features: Array<{
    type: string;
    properties: {
      ISO_A2: string;
      ADMIN: string;
      ISO_A3: string;
      BORDER: number;
    };
    geometry: {
      type: string;
      coordinates: Array<Array<Array<any>>>;
    };
  }>;
};

type GeoStore = {
  subdivisions: Subdivisions | null;
  countries: Country | null;
  regionNames: Map<string, string> | null;
  subdivisionsError: string | null;
  countriesError: string | null;
  regionNamesError: string | null;
  fetchSubdivisions: () => Promise<void>;
  fetchCountries: () => Promise<void>;
  fetchRegionNames: () => Promise<void>;
  getRegionName: (region: string) => string;
};

// One request per file, shared by every caller while it is in flight. A failed load is dropped so
// the next caller retries it.
const pendingLoads = new Map<string, Promise<void>>();

function loadOnce(url: string, load: () => Promise<void>): Promise<void> {
  let pending = pendingLoads.get(url);
  if (!pending) {
    pending = load().catch(error => {
      pendingLoads.delete(url);
      throw error;
    });
    pendingLoads.set(url, pending);
  }
  return pending;
}

async function fetchJson<T>(url: string, failureMessage: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(failureMessage);
  return response.json();
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

export const lookupRegionName = (regionNames: Map<string, string> | null, region: string) =>
  (region && regionNames?.get(region)) || "";

export const useGeoStore = create<GeoStore>((set, get) => ({
  subdivisions: null,
  countries: null,
  regionNames: null,
  subdivisionsError: null,
  countriesError: null,
  regionNamesError: null,

  fetchSubdivisions: async () => {
    if (get().subdivisions) return;
    set({ subdivisionsError: null });
    try {
      await loadOnce(subdivisionsGeoUrl, async () => {
        set({ subdivisions: await fetchJson<Subdivisions>(subdivisionsGeoUrl, "Failed to fetch subdivisions") });
      });
    } catch (error) {
      set({ subdivisionsError: errorMessage(error) });
    }
  },

  fetchCountries: async () => {
    if (get().countries) return;
    set({ countriesError: null });
    try {
      await loadOnce(countriesGeoUrl, async () => {
        set({ countries: await fetchJson<Country>(countriesGeoUrl, "Failed to fetch countries") });
      });
    } catch (error) {
      set({ countriesError: errorMessage(error) });
    }
  },

  fetchRegionNames: async () => {
    if (get().regionNames) return;
    set({ regionNamesError: null });
    try {
      await loadOnce(subdivisionNamesUrl, async () => {
        const names = await fetchJson<Record<string, string>>(subdivisionNamesUrl, "Failed to fetch region names");
        set({ regionNames: new Map(Object.entries(names)) });
      });
    } catch (error) {
      set({ regionNamesError: errorMessage(error) });
    }
  },

  getRegionName: (region: string) => lookupRegionName(get().regionNames, region),
}));

// Helper functions to get current data
export const getSubdivisions = () => {
  return useGeoStore.getState().subdivisions;
};

export const getCountries = () => {
  return useGeoStore.getState().countries;
};
