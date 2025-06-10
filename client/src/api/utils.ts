import { DateTime } from "luxon";
import { Time } from "../components/DateSelector/types";
import axios, { AxiosRequestConfig } from "axios";
import { BACKEND_URL } from "../lib/const";
import { timeZone } from "../lib/dateTimeUtils";

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
  if (time.mode === "all-time") {
    return { startDate: null, endDate: null };
  }
  if (time.mode === "last-24-hours") {
    return { startDate: null, endDate: null };
  }
  return { startDate: time.day, endDate: time.day };
}

export function getQueryParams(
  time: Time,
  additionalParams: Record<string, any> = {},
  options: {
    pastMinutesStart?: number;
    pastMinutesEnd?: number;
  } = {}
): Record<string, any> {
  const isPast24HoursMode = time.mode === "last-24-hours";

  return isPast24HoursMode
    ? {
        // Past minutes approach for last-24-hours mode
        timeZone,
        pastMinutesStart: options.pastMinutesStart ?? 24 * 60, // 24 hours ago by default
        pastMinutesEnd: options.pastMinutesEnd ?? 0, // now by default
        ...additionalParams,
      }
    : {
        // Regular date-based approach
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

  try {
    const response = await axios({
      url: fullUrl,
      params: processedParams,
      withCredentials: true,
      ...config,
    });

    return response.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}
