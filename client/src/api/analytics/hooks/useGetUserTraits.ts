import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import {
  fetchUserTraitKeys,
  fetchUserTraitValues,
  fetchUserTraitValueUsers,
  TraitKeysResponse,
  TraitValuesResponse,
  TraitValueUsersResponse,
} from "../endpoints";

export function useGetUserTraitKeys() {
  const { site } = useStore();

  return useQuery<TraitKeysResponse>({
    queryKey: ["user-trait-keys", site],
    queryFn: () => fetchUserTraitKeys(site),
    enabled: !!site,
  });
}

export function useGetUserTraitValues(key: string | null) {
  const { site } = useStore();
  const limit = 1000;

  return useInfiniteQuery<TraitValuesResponse>({
    queryKey: ["user-trait-values", site, key],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchUserTraitValues(site, {
        key: key!,
        limit,
        offset: pageParam as number,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.values.length, 0);
      return lastPage.hasMore ? totalFetched : undefined;
    },
    enabled: !!site && !!key,
  });
}

export function useGetUserTraitValueUsers(key: string | null, value: string | null) {
  const { site } = useStore();
  const limit = 250;

  return useInfiniteQuery<TraitValueUsersResponse>({
    queryKey: ["user-trait-value-users", site, key, value],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchUserTraitValueUsers(site, {
        key: key!,
        value: value!,
        limit,
        offset: pageParam as number,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.users.length, 0);
      return lastPage.hasMore ? totalFetched : undefined;
    },
    enabled: !!site && !!key && value !== null,
  });
}
