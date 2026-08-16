import { TraitKeysResponse, TraitValuesResponse, TraitValueUsersResponse } from "../endpoints";
import { useAnalyticsInfiniteQuery, useAnalyticsQuery } from "../useAnalyticsQuery";

const VALUES_LIMIT = 1000;
const USERS_LIMIT = 250;

// Trait keys and values describe the whole site, not the selected period.
const TRAIT_CONTEXT = { useTime: false, useFilters: false } as const;

export function useGetUserTraitKeys() {
  return useAnalyticsQuery<TraitKeysResponse>({
    key: "user-trait-keys",
    path: "user-traits/keys",
    unwrap: false,
    ...TRAIT_CONTEXT,
    staleTime: 0,
    placeholder: false,
  });
}

export function useGetUserTraitValues(key: string | null) {
  return useAnalyticsInfiniteQuery<TraitValuesResponse>({
    key: ["user-trait-values", key],
    path: "user-traits/values",
    unwrap: false,
    ...TRAIT_CONTEXT,
    params: { key, limit: VALUES_LIMIT },
    staleTime: 0,
    initialPageParam: 0,
    pageParams: offset => ({ offset }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.reduce((total, page) => total + page.values.length, 0) : undefined,
    enabled: !!key,
  });
}

export function useGetUserTraitValueUsers(key: string | null, value: string | null) {
  return useAnalyticsInfiniteQuery<TraitValueUsersResponse>({
    key: ["user-trait-value-users", key, value],
    path: "user-traits/users",
    unwrap: false,
    ...TRAIT_CONTEXT,
    params: { key, value, limit: USERS_LIMIT },
    staleTime: 0,
    initialPageParam: 0,
    pageParams: offset => ({ offset }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.reduce((total, page) => total + page.users.length, 0) : undefined,
    enabled: !!key && value !== null,
  });
}
