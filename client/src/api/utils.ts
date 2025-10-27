import { DateTime } from "luxon";
import { Time } from "../components/DateSelector/types";
import axios, { AxiosRequestConfig } from "axios";
import { BACKEND_URL } from "../lib/const";
import { timeZone } from "../lib/dateTimeUtils";
import { useStore } from "../lib/store";

export function getStartAndEndDate(time: Time) {
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

export function getQueryParams(time: Time, additionalParams: Record<string, any> = {}): Record<string, any> {
  if (time.mode === "past-minutes") {
    return {
      timeZone,
      pastMinutesStart: time.pastMinutesStart,
      pastMinutesEnd: time.pastMinutesEnd,
      ...additionalParams,
    };
  }

  // Regular date-based approach
  return {
    ...getStartAndEndDate(time),
    timeZone,
    ...additionalParams,
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
