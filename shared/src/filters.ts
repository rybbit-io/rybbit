export type FilterType = "equals" | "not_equals" | "contains" | "not_contains";

export type FilterParameter =
  | "browser"
  | "operating_system"
  | "language"
  | "country"
  | "region"
  | "city"
  | "device_type"
  | "referrer"
  | "hostname"
  | "pathname"
  | "page_title"
  | "querystring"
  | "event_name"
  | "channel"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_term"
  | "utm_content"
  | "entry_page"
  | "exit_page"
  | "dimensions"
  | "browser_version"
  | "operating_system_version"
  | "user_id"
  | "lat"
  | "lon";

export interface Filter {
  parameter: FilterParameter;
  value: (string | number)[];
  type: FilterType;
}
