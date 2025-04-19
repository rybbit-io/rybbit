import { z } from "zod";

const dateSchema = z.string()
  .nonempty({ message: "Date is required." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in YYYY-MM-DD format.",
  });

const startDateSchema = dateSchema
  .describe("The start date of the time interval to fetch analytics data from in YYYY-MM-DD format.");

const endDateSchema = dateSchema
  .describe("The end date of the time interval to fetch analytics data from in YYYY-MM-DD format.");

const parameterDescription = `The purpose of each parameter in the context of web analytics is explained below.

- browser: Helps in analyzing which browsers are most commonly used.
- operating_system: Displays trends based on the OS, which can influence design decisions.
- device_type: Critical for optimizing user experience across different devices.
- dimensions: The display resolution of the user's device. Useful for optimizing visual layout and responsiveness.
- language: Useful for internationalization and understanding the linguistic demographics.
- country: Provides insights into geographic distribution and regional traffic patterns.
- region: A specific country subdivision, such as a state or province. Useful for granular geographic analysis beyond just the country level.
- referrer: The URL of the webpage that referred the user to the site. Helps in tracking traffic sources.
- pathname: The path component of a URL that the user visited. Useful for analyzing which specific sections or pages of the site are most popular.
- entry_page: Identifies the entry point for sessions, which is valuable for understanding the initial touchpoint of the user experience.
- exit_page: Provides insight into where users leave the site, which can help in analyzing drop-off points and improving retention.`;

const parameterSchema = z.enum([
  "browser",
  "operating_system",
  "device_type",
  "dimensions",
  "language",
  "country",
  "region",
  "referrer",
  "pathname",
  "entry_page",
  "exit_page",
]).describe("The data property to aggregate.\n\n" + parameterDescription);

const filterParameterSchema = parameterSchema
  .describe("The record field to use for filtering, i.e., the property of the data on which records will be filtered.\n\n" + parameterDescription);

const filterTypeSchema = z.enum(["equals", "not_equals", "contains", "not_contains"])
  .describe(`The type of comparison to perform. Can be an exact match ("equals"), a non-match ("not_equals"), a partial match ("contains"), or a negative partial match ("not_contains").`);

const filterValueSchema = z.array(z.string())
  .nonempty({ message: "Filter values must contain at least one string." })
  .describe(`An array of one or more string values to match against the chosen parameter. These values are used to filter the records.

If there is only one value, a record satisfies the filter if it matches the value based on the selected comparison type. If there are multiple values, a record satisfies the filter if it matches any of the provided values based on the selected comparison type.

The allowable values for each parameter are described below.

- browser:
    - Description: A string extracted from the User-Agent header representing the browser name.
    - Examples: "Chrome", "Safari", "Edge", "Firefox".
- operating_system:
    - Description: A string representing the operating system from the User-Agent header.
    - Examples: "Windows", "macOS", "Linux", "Android", "iOS".
- device_type:
    - Description: A string that indicates the type of device accessing the site.
    - Allowed Values: "Desktop", "Mobile", or "Tablet".
    - Notes: This is a closed set, so only these three values are acceptable.
- dimensions:
    - Description: A string representing the display resolution in the format "widthxheight".
    - Examples: "1920x1080", "1366x768".
- language:
    - Description: A string conforming to IETF BCP 47 language tags.
    - Examples: "en-US", "en-GB", "fr-FR", or simply "en", "fr" if the region subtag is missing.
    - Notes: The language subtag (e.g., "en", "fr") is always present, while the region subtag (e.g., "US", "GB") may be omitted if necessary.
- country:
    - Description: A string representing an ISO 3166-1 alpha-2 country code.
    - Examples: "US", "CA", "GB", "FR".
    - Notes: This standard ensures that only valid two-letter country codes are accepted.
- region:
    - Description: A string representing an ISO 3166-2 code for country subdivisions.
    - Examples: "US-CA" (for California), "FR-IDF" (for Île-de-France).
    - Notes: This value follows a standardized format with a country code and a subdivision code separated by a hyphen.
- referrer:
    - Description: A string containing the URL returned by JavaScript's document.referrer.
    - Examples: "https://google.com/", "https://reddit.com/".
    - Notes: Since the referrer can be any valid URL, this value can be highly varied; typically, only the domain or full URL is used.
- pathname:
    - Description: A string representing the path portion of a URL, as returned by JavaScript's URL.pathname.
    - Examples: "/home", "/about", "/products/item-123".
    - Notes: This excludes the domain and query string, focusing only on the path structure.
- entry_page:
    - Description: A string representing the path portion of the URL where a session begins, extracted from the first pageview in a session.
    - Examples: "/landing", "/homepage".
    - Notes: It uses the same format as pathname but specifically denotes the entry point of the session.
- exit_page:
    - Description: A string representing the path portion of the URL where a session ends, extracted from the last pageview in a session.
    - Examples: "/checkout", "/thank-you".
    - Notes: Like entry_page, it follows the pathname structure but indicates the session's end page.`);

const filterSchema = z.object({
  parameter: filterParameterSchema,
  type: filterTypeSchema,
  value: filterValueSchema,
}).describe("Defines a condition used to extract a specific subset of records.");

const filtersSchema = z.array(filterSchema)
  .transform(filters => JSON.stringify(filters))
  .describe("An array of filter objects, where each object specifies a single filtering condition. This allows for multiple conditions to be combined, each targeting a different property of the data. Only records that satisfy all filter conditions will be returned.");

const bucketSchema = z.enum(["hour", "day", "week", "month"])
  .describe(`The granularity level to group the data by.

- hour: Always allowed.
- day: Only allowed if the startDate and endDate are at least 1 day apart.
- week: Only allowed if the startDate and endDate are at least 14 days apart.
- month: Only allowed if the startDate and endDate are at least 60 days apart.`);

const limitSchema = z.number()
  .int({
    message: "Limit must be an integer.",
  })
  .gte(1, {
    message: "Limit must be greater than or equal to 1.",
  })
  .lte(100, {
    message: "Limit must be less than or equal to 100.",
  })
  .describe("The maximum number of data records to return. Must be an integer between 1 and 100.");

export const getLiveUserCountToolSchema = z.object({});

export const getOverviewToolSchema = z.object({
  startDate: startDateSchema,
  endDate: endDateSchema,
  filters: filtersSchema,
});

export const getOverviewBucketedToolSchema = z.object({
  startDate: startDateSchema,
  endDate: endDateSchema,
  filters: filtersSchema,
  bucket: bucketSchema,
});

export const getParameterStatsToolSchema = z.object({
  startDate: startDateSchema,
  endDate: endDateSchema,
  filters: filtersSchema,
  parameter: parameterSchema,
  limit: limitSchema,
});
