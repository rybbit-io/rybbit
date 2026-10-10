import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { GetSessionsResponse, LiveUserCountResponse } from "../../../../api/analytics/endpoints";

export type FirstPageviewPhase = "unknown" | "none" | "waiting" | "filling" | "ready" | "dismissed";

export type FirstPageviewEvent =
  | { type: "has-data"; hasData: boolean | undefined }
  | { type: "settled" }
  | { type: "dismiss" };

type Session = GetSessionsResponse[number];

// useSiteHasData's key.
const SITE_HAS_DATA_KEY = "site-has-data";
// Both polled every 10 s by SubHeader's LiveUserCount (useGetLiveUserCount, useGetSessionsInfinite).
const LIVE_USER_COUNT_KEY = "live-user-count";
const LIVE_SESSIONS_KEY = "sessions-infinite";
// The dashboard refetch waits for the morph (install card fade-out, then the height spring) to mostly
// settle: its re-renders would otherwise stall the spring on the main thread into visible jumps. It
// also keeps "Your dashboard is filling in" on screen long enough to read.
export const ARRIVAL_REFRESH_DELAY_MS = 600;

/**
 * The install card's lifecycle for one site:
 * unknown → waiting (has-data answered false) → filling (it flipped to true while we watched)
 * → ready (the dashboard's queries refetched) → dismissed.
 * A site that already had data when has-data first answered goes to "none": nothing to celebrate.
 */
export function nextFirstPageviewPhase(phase: FirstPageviewPhase, event: FirstPageviewEvent): FirstPageviewPhase {
  switch (event.type) {
    case "has-data":
      if (event.hasData === undefined) return phase;
      if (phase === "unknown") return event.hasData ? "none" : "waiting";
      return phase === "waiting" && event.hasData ? "filling" : phase;
    case "settled":
      return phase === "filling" ? "ready" : phase;
    case "dismiss":
      return phase === "filling" || phase === "ready" ? "dismissed" : phase;
  }
}

/**
 * Whether a query was built by useAnalyticsQuery / useAnalyticsInfiniteQuery for `site`. Those keys are
 * one or more key parts followed by [scope, path, params, body], plus "infinite" for infinite queries.
 */
export function isSiteAnalyticsQueryKey(queryKey: readonly unknown[], site: string): boolean {
  const end = queryKey[queryKey.length - 1] === "infinite" ? queryKey.length - 1 : queryKey.length;
  const scope = end - 4;
  const params = queryKey[scope + 2];
  return (
    scope >= 1 &&
    String(queryKey[scope]) === site &&
    typeof queryKey[scope + 1] === "string" &&
    typeof params === "object" &&
    params !== null
  );
}

/** The session with the earliest start across cached session-list pages. */
export function earliestSession(cached: readonly unknown[]): Session | undefined {
  let earliest: Session | undefined;
  for (const data of cached) {
    for (const page of (data as InfiniteData<GetSessionsResponse | null> | undefined)?.pages ?? []) {
      for (const session of page ?? []) {
        if (!earliest || session.session_start < earliest.session_start) earliest = session;
      }
    }
  }
  return earliest;
}

interface Journey {
  site: string;
  phase: FirstPageviewPhase;
}

const startJourney = (site: string): Journey => ({ site, phase: "unknown" });

/** The card's phase for one site. Switching sites starts over. */
export function useFirstPageviewJourney(site: string, hasData: boolean | undefined) {
  const [journey, setJourney] = useState(() => startJourney(site));

  // Folded in during render rather than in an effect, so a has-data flip never paints a stale card.
  const base = journey.site === site ? journey : startJourney(site);
  const phase = nextFirstPageviewPhase(base.phase, { type: "has-data", hasData });
  if (base !== journey || phase !== journey.phase) setJourney({ ...base, phase });

  const settle = useCallback(
    () => setJourney(current => ({ ...current, phase: nextFirstPageviewPhase(current.phase, { type: "settled" }) })),
    []
  );
  const dismiss = useCallback(
    () => setJourney(current => ({ ...current, phase: nextFirstPageviewPhase(current.phase, { type: "dismiss" }) })),
    []
  );
  return { phase, settle, dismiss };
}

/**
 * While the site has no data, re-ask has-data the moment the live-user-count query (which SubHeader's
 * LiveUserCount polls every 10 s) sees a visitor, instead of waiting out has-data's 30 s poll.
 *
 * It listens to the query cache instead of mounting a useGetLiveUserCount observer of its own: each
 * observer runs its own refetch interval, and one mounted here, in the layout that outlives every page's
 * LiveUserCount, would drift out of phase with it and double the requests, or start a new 10 s poll on
 * pages that have no LiveUserCount. Pages without one fall back to has-data's own poll.
 */
export function useLiveVisitorNudge(site: string, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !site) return;
    const cache = queryClient.getQueryCache();
    const someoneOnline = () =>
      cache
        .findAll({ queryKey: [LIVE_USER_COUNT_KEY, site] })
        .some(query => ((query.state.data as LiveUserCountResponse | undefined)?.count ?? 0) > 0);
    const nudge = () => void queryClient.invalidateQueries({ queryKey: [SITE_HAS_DATA_KEY, site], exact: true });

    let online = someoneOnline();
    if (online) nudge();
    return cache.subscribe(event => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      const [key, scope] = event.query.queryKey;
      if (key !== LIVE_USER_COUNT_KEY || scope !== site) return;
      const now = someoneOnline();
      if (now && !online) nudge();
      online = now;
    });
  }, [enabled, queryClient, site]);
}

/**
 * The first visitor, read from sessions the live-sessions query has already fetched for the site.
 * Never fetches: undefined until (and unless) that data is in the cache.
 */
export function useFirstSession(site: string, enabled: boolean): Session | undefined {
  const cache = useQueryClient().getQueryCache();
  const subscribe = useCallback(
    (onChange: () => void) => (enabled ? cache.subscribe(onChange) : () => {}),
    [cache, enabled]
  );
  const getSnapshot = () =>
    enabled && site
      ? earliestSession(cache.findAll({ queryKey: [LIVE_SESSIONS_KEY, site] }).map(query => query.state.data))
      : undefined;
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/**
 * Shortly after arrival, refetch this site's analytics queries that are on screen and mark the rest
 * stale, so the dashboard fills in now rather than after their 60 s staleTime. Calls `onSettled` once
 * they land. Dismissing (or leaving) before the delay runs out starts the refetch at once.
 */
export function useArrivalRefresh(site: string, enabled: boolean, onSettled: () => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !site) return;
    let current = true;
    let started = false;
    const refresh = () => {
      if (started) return;
      started = true;
      void queryClient
        .invalidateQueries({ predicate: query => isSiteAnalyticsQueryKey(query.queryKey, site) })
        .then(() => {
          if (current) onSettled();
        });
    };
    const timeout = window.setTimeout(refresh, ARRIVAL_REFRESH_DELAY_MS);
    return () => {
      current = false;
      window.clearTimeout(timeout);
      refresh();
    };
  }, [enabled, onSettled, queryClient, site]);
}
