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
