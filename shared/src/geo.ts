const regionNamesInEnglish = new Intl.DisplayNames(["en"], { type: "region" });

/** English country name for an ISO 3166-1 alpha-2 code, falling back to the code itself. */
export function getCountryName(countryCode: string): string {
  try {
    return regionNamesInEnglish.of(countryCode.toUpperCase()) || countryCode;
  } catch {
    return countryCode;
  }
}
