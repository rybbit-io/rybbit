import { authedFetch } from "../../utils";
import { updateSiteConfig } from "./sites";

export interface ExcludedCountriesResponse {
  success: boolean;
  excludedCountries: string[];
  error?: string;
}

export interface UpdateExcludedCountriesRequest {
  siteId: number;
  excludedCountries: string[];
}

export interface UpdateExcludedCountriesResponse {
  success: boolean;
  message: string;
  excludedCountries: string[];
  error?: string;
  details?: string[];
}

export const fetchExcludedCountries = async (siteId: number): Promise<ExcludedCountriesResponse> => {
  return await authedFetch<ExcludedCountriesResponse>(`/sites/${siteId}/excluded-countries`);
};

export const updateExcludedCountries = async (
  siteId: number,
  excludedCountries: string[]
): Promise<UpdateExcludedCountriesResponse> => {
  try {
    await updateSiteConfig(siteId, { excludedCountries });
    return {
      success: true,
      message: "Excluded countries updated successfully",
      excludedCountries: excludedCountries,
    };
  } catch (error) {
    throw new Error(
      `Failed to update excluded countries: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};
