import { Filter } from "@rybbit/shared";
import { DateTime } from "luxon";
import { Time } from "../components/DateSelector/types";
import axios, { AxiosRequestConfig } from "axios";
import { BACKEND_URL } from "../lib/const";
import { getTimezone, useStore } from "../lib/store";
import { CommonApiParams } from "./analytics/endpoints/types";

export function getStartAndEndDate(time: Time): { startDate: string | null; endDate: string | null } {
  if (time.mode === "range") {
    return { startDate: time.startDate, endDate: time.endDate };
  }
  if (time.mode === "week") {
    return {
      startDate: time.week,
      endDate: DateTime.fromISO(time.week).endOf("week").toISODate(),
    };
  }
  if (time.mode === "month") {
    return {
      startDate: time.month,
      endDate: DateTime.fromISO(time.month).endOf("month").toISODate(),
    };
  }
  if (time.mode === "year") {
    return {
      startDate: time.year,
      endDate: DateTime.fromISO(time.year).endOf("year").toISODate(),
    };
  }
  if (time.mode === "all-time" || time.mode === "past-minutes") {
    return { startDate: null, endDate: null };
  }
  return { startDate: time.day, endDate: time.day };
}

/**
 * Build CommonApiParams from a Time object, handling all time modes including past-minutes.
 * This centralizes the logic for converting Time to API params across all hooks.
 */
export function buildApiParams(time: Time, options: { filters?: Filter[] } = {}): CommonApiParams {
  const timeZone = getTimezone();

  if (time.mode === "past-minutes") {
    return {
      startDate: "",
      endDate: "",
      timeZone,
      filters: options.filters,
      pastMinutesStart: time.pastMinutesStart,
      pastMinutesEnd: time.pastMinutesEnd,
    };
  }

  const { startDate, endDate } = getStartAndEndDate(time);
  return {
    startDate: startDate ?? "",
    endDate: endDate ?? "",
    timeZone,
    filters: options.filters,
  };
}

export async function authedFetch<T>(
  url: string,
  params?: Record<string, any>,
  config: AxiosRequestConfig = {}
): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${BACKEND_URL}${url}`;

  // Process params to handle arrays correctly for backend JSON parsing
  let processedParams = params;
  if (params) {
    processedParams = { ...params };
    Object.entries(processedParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Convert arrays to JSON strings for backend parsing
        processedParams![key] = JSON.stringify(value);
      }
    });
  }

  // Get private key from store and add to headers if present
  const privateKey = useStore.getState().privateKey;
  const headers = {
    ...config.headers,
    ...(privateKey ? { "x-private-key": privateKey } : {}),
  };

  try {
    const response = await axios({
      url: fullUrl,
      params: processedParams,
      withCredentials: true,
      ...config,
      headers,
    });

    return response.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}
