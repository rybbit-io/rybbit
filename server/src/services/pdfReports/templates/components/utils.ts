import { DateTime } from "luxon";

export const calculateGrowth = (
  current: number | null | undefined,
  previous: number | null | undefined
): { value: string; isPositive: boolean } => {
  const curr = current ?? 0;
  const prev = previous ?? 0;

  if (prev === 0) {
    return { value: curr > 0 ? "+100%" : "0%", isPositive: curr >= 0 };
  }
  const growth = ((curr - prev) / prev) * 100;
  const sign = growth > 0 ? "+" : "";
  return { value: `${sign}${growth.toFixed(1)}%`, isPositive: growth >= 0 };
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export const formatNumber = Intl.NumberFormat("en-US", {
  notation: "compact",
}).format;

export const safeToFixed = (num: number | null | undefined, decimals: number = 1): string => {
  if (num == null || isNaN(num)) {
    return "0";
  }
  return num.toFixed(decimals);
};

export const truncateString = (str: string, maxLength: number = 35): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
};

const regionNamesInEnglish = new Intl.DisplayNames(["en"], { type: "region" });

export const getCountryFlagUrl = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return "";
  return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
};

export const getCountryName = (countryCode: string): string => {
  try {
    return regionNamesInEnglish.of(countryCode.toUpperCase()) || countryCode;
  } catch {
    return countryCode;
  }
};

export const formatDateRange = (startDate: string, endDate: string, timeZone: string): string => {
  const start = DateTime.fromISO(startDate, { zone: timeZone });
  const end = DateTime.fromISO(endDate, { zone: timeZone });
  const format = "MMMM d, yyyy";
  return `${start.toFormat(format)} - ${end.toFormat(format)}`;
};
