import { FilterParameter, FilterType } from "@rybbit/shared";
import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useGetRegionName } from "../../../../../lib/geo";
import { removeFilter, updateFilter, useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { isNumericParameter } from "./const";
import { getParameterValueLabel } from "./utils";

export function Filters({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const t = useExtracted();
  const { filters } = useStore();
  const { getRegionName } = useGetRegionName();

  const getTranslatedParameterName = (parameter: FilterParameter): string => {
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
      case "vpn": return t("VPN");
      case "crawler": return t("Crawler");
      case "datacenter": return t("Datacenter");
      case "company": return t("Company");
      case "company_type": return t("Company Type");
      case "company_domain": return t("Company Domain");
      case "asn_org": return t("ASN Org");
      case "asn_type": return t("ASN Type");
      case "asn_domain": return t("ASN Domain");
      default: return parameter;
    }
  };

  const getTranslatedFilterType = (type: FilterType): string => {
    switch (type) {
      case "equals": return t("is");
      case "not_equals": return t("is not");
      case "contains": return t("contains");
      case "not_contains": return t("not contains");
      case "regex": return t("matches");
      case "not_regex": return t("not matches");
      case "greater_than": return ">";
      case "less_than": return "<";
      default: return type;
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter, i) => {
        const disabled = availableFilters && !availableFilters.includes(filter.parameter);

        return (
          <Tooltip key={filter.parameter}>
            {disabled && (
              <TooltipContent>
                <p>{t("Filter not active for this page")}</p>
              </TooltipContent>
            )}
            <TooltipTrigger>
              <div
                key={filter.parameter}
                className={cn(
                  "px-2 py-1 rounded-lg text-neutral-500 dark:text-neutral-400 flex items-center gap-1 text-sm",
                  disabled ? "bg-neutral-200 dark:bg-neutral-900" : "bg-neutral-100 dark:bg-neutral-850"
                )}
              >
                <div
                  className={cn(
                    disabled ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-600 dark:text-neutral-300"
                  )}
                >
                  {getTranslatedParameterName(filter.parameter)}
                </div>
                <div
                  className={cn(
                    "text-emerald-400 font cursor-pointer whitespace-nowrap",
                    (filter.type === "not_equals" || filter.type === "not_contains" || filter.type === "not_regex") &&
                      "text-red-400"
                  )}
                  onClick={() => {
                    const isNumeric = isNumericParameter(filter.parameter);
                    let newType: FilterType = "equals";

                    if (isNumeric) {
                      // Numeric cycle: equals -> not_equals -> greater_than -> less_than -> equals
                      if (filter.type === "equals") {
                        newType = "not_equals";
                      } else if (filter.type === "not_equals") {
                        newType = "greater_than";
                      } else if (filter.type === "greater_than") {
                        newType = "less_than";
                      } else if (filter.type === "less_than") {
                        newType = "equals";
                      }
                    } else {
                      // String cycle: equals -> not_equals -> contains -> not_contains -> regex -> not_regex -> equals
                      if (filter.type === "equals") {
                        newType = "not_equals";
                      } else if (filter.type === "not_equals") {
                        newType = "contains";
                      } else if (filter.type === "contains") {
                        newType = "not_contains";
                      } else if (filter.type === "not_contains") {
                        newType = "regex";
                      } else if (filter.type === "regex") {
                        newType = "not_regex";
                      } else if (filter.type === "not_regex") {
                        newType = "equals";
                      }
                    }

                    updateFilter({ ...filter, type: newType }, i);
                  }}
                >
                  {getTranslatedFilterType(filter.type)}
                </div>
                <div
                  className={cn(
                    "text-neutral-900 dark:text-neutral-100 font-medium whitespace-nowrap",
                    disabled && "text-neutral-400 dark:text-neutral-500"
                  )}
                >
                  {getParameterValueLabel(filter, getRegionName)}
                </div>
                <div
                  className="text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200"
                  onClick={() => removeFilter(filter)}
                >
                  <X size={16} strokeWidth={3} />
                </div>
              </div>
            </TooltipTrigger>
          </Tooltip>
        );
      })}
    </div>
  );
}
