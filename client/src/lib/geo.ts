import { useCallback, useEffect } from "react";
import { useGeoStore, getSubdivisions, getCountries, lookupRegionName } from "./geoStore";

// Hook-based access (for components that need reactive updates). Each hook loads its file the first
// time a component using it mounts; nothing is fetched on import.
export const useSubdivisions = () => {
  const data = useGeoStore(state => state.subdivisions);
  const error = useGeoStore(state => state.subdivisionsError);

  useEffect(() => {
    void useGeoStore.getState().fetchSubdivisions();
  }, []);

  return {
    data,
    isLoading: !data && !error,
    error,
  };
};

export const useCountries = () => {
  const data = useGeoStore(state => state.countries);
  const error = useGeoStore(state => state.countriesError);

  useEffect(() => {
    void useGeoStore.getState().fetchCountries();
  }, []);

  return {
    data,
    isLoading: !data && !error,
    error,
  };
};

/** Subdivision code ("US-NC") → name. Returns "" until the names load and for unknown codes. */
export const useGetRegionName = () => {
  const regionNames = useGeoStore(state => state.regionNames);

  useEffect(() => {
    void useGeoStore.getState().fetchRegionNames();
  }, []);

  const getRegionName = useCallback((region: string) => lookupRegionName(regionNames, region), [regionNames]);

  return {
    getRegionName,
  };
};

// Direct access functions (no hooks required). Reads whatever a hook has already loaded.
export const getRegionName = (region: string) => {
  return useGeoStore.getState().getRegionName(region);
};

// Direct access to current data
export { getSubdivisions, getCountries };

/**
 * Splits a city metric value, `${region}-${city}`, where region is an ISO 3166-2 code ("US-NC") or
 * empty. City names can contain hyphens themselves ("Winston-Salem"), so everything after the region
 * belongs to the city.
 */
export function parseCityValue(value: string): { country: string; region: string; city: string } {
  const parts = value.split("-");
  if (parts.length === 2) {
    const [country, city] = parts;
    return { country, region: "", city };
  }
  if (parts[0] === "") {
    return { country: "", region: "", city: parts.slice(1).join("-") };
  }
  const [country, region, ...city] = parts;
  return { country, region, city: city.join("-") };
}
