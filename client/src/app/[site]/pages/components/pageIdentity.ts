import type { Filter } from "@rybbit/shared";

import type { PageTitleItem } from "@/api/analytics/endpoints";

export function getPageItemKey(item: PageTitleItem) {
  return item.value ? `title:${item.value}` : `pathname:${item.pathname}`;
}

export function getPageItemFilters(item: PageTitleItem): Filter[] {
  if (item.value) {
    return [{ parameter: "page_title", value: [item.value], type: "equals" }];
  }

  return [
    { parameter: "page_title", value: [], type: "is_null" },
    { parameter: "pathname", value: [item.pathname], type: "equals" },
  ];
}
