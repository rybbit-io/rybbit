import { TraitBreakdown, TraitKeysResponse } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";
import { narrowingParams, UsersNarrowing, useUserPageFilters } from "./useGetUsers";

type PeriodTime = "current" | "previous";

// Trait keys describe the whole site, not the selected period.
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

/**
 * The period's users grouped by one trait. Takes the same narrowing as the
 * users list (never a trait group of its own), so a group's count matches the
 * rows that open under it.
 */
export function useGetUserTraitBreakdown({
  traitKey,
  periodTime,
  narrowing,
  enabled = true,
}: {
  traitKey: string | null;
  periodTime?: PeriodTime;
  narrowing: Omit<UsersNarrowing, "traitGroup">;
  enabled?: boolean;
}) {
  return useAnalyticsQuery<TraitBreakdown>({
    // Under the "users" prefix so the mutations that invalidate the list refresh this too.
    key: ["users", "trait-breakdown"],
    path: "user-traits/breakdown",
    periodTime,
    ...useUserPageFilters(),
    params: { key: traitKey ?? undefined, ...narrowingParams(narrowing) },
    staleTime: 0,
    enabled: enabled && !!traitKey,
  });
}
