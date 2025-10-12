import { create } from "zustand";

const countriesGeoUrl = "/countries.json";
const subdivisionsGeoUrl = "/subdivisions.json";

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
  isLoadingSubdivisions: boolean;
  isLoadingCountries: boolean;
  subdivisionsError: string | null;
  countriesError: string | null;
  fetchSubdivisions: () => Promise<void>;
  fetchCountries: () => Promise<void>;
  getRegionName: (region: string) => string;
};

export const useGeoStore = create<GeoStore>((set, get) => ({
  subdivisions: null,
  countries: null,
  isLoadingSubdivisions: false,
  isLoadingCountries: false,
  subdivisionsError: null,
  countriesError: null,

  fetchSubdivisions: async () => {
    set({ isLoadingSubdivisions: true, subdivisionsError: null });
    try {
      const response = await fetch(subdivisionsGeoUrl);
      if (!response.ok) throw new Error("Failed to fetch subdivisions");
      const data = await response.json();
      set({ subdivisions: data, isLoadingSubdivisions: false });
    } catch (error) {
      set({
        subdivisionsError: error instanceof Error ? error.message : "Unknown error",
        isLoadingSubdivisions: false,
      });
    }
  },

  fetchCountries: async () => {
    set({ isLoadingCountries: true, countriesError: null });
    try {
      const response = await fetch(countriesGeoUrl);
      if (!response.ok) throw new Error("Failed to fetch countries");
      const data = await response.json();
      set({ countries: data, isLoadingCountries: false });
    } catch (error) {
      set({
        countriesError: error instanceof Error ? error.message : "Unknown error",
        isLoadingCountries: false,
      });
    }
  },

  getRegionName: (region: string) => {
    const { subdivisions } = get();
    return subdivisions?.features.find(feature => feature.properties.iso_3166_2 === region)?.properties.name ?? "";
  },
}));

// Auto-fetch data on store initialization
const store = useGeoStore.getState();
store.fetchSubdivisions();
store.fetchCountries();

// Helper functions to get current data
export const getSubdivisions = () => {
  return useGeoStore.getState().subdivisions;
};

export const getCountries = () => {
  return useGeoStore.getState().countries;
};
