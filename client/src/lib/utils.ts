import { clsx, type ClassValue } from "clsx";
import { Duration } from "luxon";
import { twMerge } from "tailwind-merge";
import { generateName } from "../components/Avatar";
import { userLocale } from "./dateTimeUtils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatter = Intl.NumberFormat(userLocale, {
  notation: "compact",
}).format;

export function formatSecondsAsMinutesAndSeconds(value: number) {
  const duration = Duration.fromMillis(value * 1000);
  const hours = Math.floor(duration.as("hours"));
  const minutes = Math.floor(duration.as("minutes") % 60);
  const seconds = Math.floor(duration.as("seconds") % 60);

  if (hours > 0) {
    return `${hours}hr ${minutes}min`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getCountryName = (countryCode: string) => {
  try {
    return regionNamesInEnglish.of(countryCode.toUpperCase()) || countryCode;
  } catch (error) {
    return countryCode;
  }
};

export function truncateString(str: string, n = 50) {
  return str.length > n ? str.substring(0, n) + "..." : str;
}

const regionNamesInEnglish = new Intl.DisplayNames(["en"], { type: "region" });
const languageNamesInEnglish = new Intl.DisplayNames(["en"], {
  type: "language",
});

export const getLanguageName = (languageCode: string) => {
  try {
    // Handle codes like "en-US" that have both language and region
    if (languageCode.includes("-")) {
      const [language, region] = languageCode.split("-");
      const languageName = languageNamesInEnglish.of(language);
      const regionName = regionNamesInEnglish.of(region);
      return `${languageName} (${regionName})`;
    }
    // Just a language code
    return languageNamesInEnglish.of(languageCode);
  } catch (error) {
    return languageCode;
  }
};

export function normalizeDomain(domain: string): string {
  if (!domain) return domain;

  let normalized = domain.trim();

  // Remove protocol (http:// or https://)
  normalized = normalized.replace(/^https?:\/\//, "");

  // Remove www. prefix
  normalized = normalized.replace(/^www\./, "");

  // Remove trailing slash and any path
  normalized = normalized.split("/")[0];

  // Remove trailing dots
  normalized = normalized.replace(/\.+$/, "");

  return normalized;
}

/**
 * A simple domain validation function:
 * - Ensures at least one dot separator
 * - Allows subdomains (e.g. sub.example.com)
 * - Requires the TLD to be alphabetical (e.g. .com)
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

export function getUserDisplayName<
  T extends { identified_user_id?: string; traits?: Record<string, unknown> | null; user_id?: string },
>(data: T) {
  const traitsUsername = data?.traits?.username as string | undefined;
  const traitsName = data?.traits?.name as string | undefined;
  const traitsEmail = data?.traits?.email as string | undefined;
  const isIdentified = !!data?.identified_user_id;
  return (
    traitsUsername ||
    traitsName ||
    traitsEmail ||
    (isIdentified ? (data?.identified_user_id as string) : generateName(data?.user_id as string))
  );
}
