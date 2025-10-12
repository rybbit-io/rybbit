import { getCountryPopulation } from "../../../../lib/countryPopulation";

export function processCountryData(countryData: any) {
  if (!countryData?.data) return null;

  return countryData.data.map((item: any) => {
    const population = getCountryPopulation(item.value);
    const perCapitaValue = population > 0 ? item.count / population : 0;
    return {
      ...item,
      perCapita: perCapitaValue,
    };
  });
}

export function processSubdivisionData(subdivisionData: any) {
  if (!subdivisionData?.data) return null;

  return subdivisionData.data.map((item: any) => {
    const countryCode = item.value?.split("-")[0];
    const population = getCountryPopulation(countryCode);
    const perCapitaValue = population > 0 ? item.count / (population / 10) : 0;
    return {
      ...item,
      perCapita: perCapitaValue,
    };
  });
}
