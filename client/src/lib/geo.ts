import { useGeoStore, getSubdivisions, getCountries } from "./geoStore";

// Hook-based access (for components that need reactive updates)
export const useSubdivisions = () => {
  const { subdivisions, isLoadingSubdivisions: isLoading, subdivisionsError: error } = useGeoStore();

  return {
    data: subdivisions,
    isLoading,
    error,
  };
};

export const useCountries = () => {
  const { countries, isLoadingCountries: isLoading, countriesError: error } = useGeoStore();

  return {
    data: countries,
    isLoading,
    error,
  };
};

export const useGetRegionName = () => {
  const { getRegionName } = useGeoStore();

  return {
    getRegionName,
  };
};

// Direct access functions (no hooks required)
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
