import { DateTime } from "luxon";
import { Time } from "../components/DateSelector/types";

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

/**
 * Builds a URL with query parameters from an object
 * @param url Base URL
 * @param params Object containing query parameters
 * @returns URL with query parameters
 */
export function buildUrl(url: string, params?: Record<string, any>): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === "object") {
      searchParams.append(key, JSON.stringify(value));
    } else {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function authedFetch(
  url: string,
  paramsOrOpts?: Record<string, any> | RequestInit,
  opts: RequestInit = {}
) {
  // Handle overloaded function signature
  if (
    paramsOrOpts &&
    ("method" in paramsOrOpts ||
      "headers" in paramsOrOpts ||
      "body" in paramsOrOpts)
  ) {
    // If paramsOrOpts looks like RequestInit, treat it as options
    return fetch(url, {
      credentials: "include",
      ...(paramsOrOpts as RequestInit),
    });
  }

  // Otherwise treat it as params
  const fullUrl = buildUrl(url, paramsOrOpts as Record<string, any>);

  return fetch(fullUrl, {
    credentials: "include",
    ...opts,
  });
}

export async function authedFetchWithError<T>(
  url: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...opts,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
