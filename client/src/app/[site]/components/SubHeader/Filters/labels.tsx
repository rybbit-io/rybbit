import { Filter, FilterParameter, FilterType } from "@rybbit/shared";
import type { ReactNode } from "react";
import { getCountryName, getLanguageName } from "../../../../../lib/utils";
import { FilterOptions } from "./const";
import { useExtracted } from "next-intl";

export function getParameterIcon(parameter: FilterParameter): ReactNode {
  return FilterOptions.find(o => o.value === parameter)?.icon ?? null;
}

export function useParameterLabel() {
  const t = useExtracted();

  return (parameter: FilterParameter) => {
    switch (parameter) {
      case "country": return t("Country");
      case "device_type": return t("Device Type");
      case "operating_system": return t("OS");
      case "browser": return t("Browser");
      case "referrer": return t("Referrer");
      case "pathname": return t("Path");
      case "page_title": return t("Title");
      case "querystring": return t("Query");
      case "language": return t("Language");
      case "city": return t("City");
      case "region": return t("Region");
      case "channel": return t("Channel");
      case "entry_page": return t("Entry Page");
      case "exit_page": return t("Exit Page");
      case "dimensions": return t("Dimension");
      case "event_name": return t("Event Name");
      case "utm_source": return t("UTM Source");
      case "utm_medium": return t("UTM Medium");
      case "utm_campaign": return t("UTM Campaign");
      case "utm_term": return t("UTM Term");
      case "utm_content": return t("UTM Content");
      case "browser_version": return t("Browser Version");
      case "operating_system_version": return t("OS Version");
      case "user_id": return t("User ID");
      case "lat": return t("Lat");
      case "lon": return t("Lon");
      case "hostname": return t("Hostname");
      case "timezone": return t("Timezone");
      case "tag": return t("Tag");
      default: return parameter;
    }
  }
}

export function useOperatorLabel() {
  const t = useExtracted();

  return (type: FilterType, isNumeric: boolean) => {
    switch (type) {
      case "equals": return isNumeric ? t("equals") : t("is");
      case "not_equals": return isNumeric ? t("not equals") : t("is not");
      case "contains": return t("contains");
      case "not_contains": return t("not contains");
      case "starts_with": return t("starts with");
      case "ends_with": return t("ends with");
      case "regex": return t("regex");
      case "not_regex": return t("not regex");
      case "is_null": return t("is null");
      case "is_not_null": return t("is not null");
      case "greater_than": return ">";
      case "less_than": return "<";
      case "greater_than_or_equal": return ">=";
      case "less_than_or_equal": return "<=";
      default: return type;
    }
  }
}

export function useOperatorMenuLabel() {
  const t = useExtracted();

  return (type: FilterType, isNumeric: boolean) => {
    switch (type) {
      case "equals": return isNumeric ? t("Equals") : t("Is");
      case "not_equals": return isNumeric ? t("Not equals") : t("Is not");
      case "contains": return t("Contains");
      case "not_contains": return t("Not contains");
      case "starts_with": return t("Starts with");
      case "ends_with": return t("Ends with");
      case "regex": return t("Regex");
      case "not_regex": return t("Not regex");
      case "is_null": return t("Is null");
      case "is_not_null": return t("Is not null");
      case "greater_than": return t("Greater than");
      case "less_than": return t("Less than");
      case "greater_than_or_equal": return t("Greater than or equal to");
      case "less_than_or_equal": return t("Less than or equal to");
      default: return type;
    }
  }
}

export function operatorNeedsValue(type: FilterType): boolean {
  return type !== "is_null" && type !== "is_not_null";
}

export function formatDisplayValue(
  filter: Filter,
  getRegionName: (region: string) => string | undefined
): string {
  const formatValue = (value: string | number) => {
    if (filter.parameter === "country") return getCountryName(value as string);
    if (filter.parameter === "region") return getRegionName(value as string) ?? String(value);
    if (filter.parameter === "language") return getLanguageName(value as string);
    return String(value);
  };
  return filter.value.map(formatValue).join(", ");
}

export function validateRegex(pattern: string): string | null {
  if (!pattern) return null;
  try {
    new RegExp(pattern);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid regex pattern";
  }
}
