import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute } from "../utils/analyticsQuery.js";
import {
  CohortRow,
  MAX_SCOPED_USER_IDS,
  resolveSearchScope,
  resolveTraitCohort,
  userNarrowingSchema,
  UsersQuerystring,
} from "./userScope.js";

export interface GetUserTraitBreakdownRequest {
  Params: { siteId: string };
  Querystring: UsersQuerystring & { key?: string };
}

/** Totals for a set of users. Sessions, pageviews and events are sums; the client divides for averages. */
export interface TraitGroupStats {
  users: number;
  sessions: number;
  pageviews: number;
  events: number;
}

export interface TraitBreakdown {
  key: string;
  /** True when more identified users were active than can be joined to their traits; nothing else is filled in. */
  limited: boolean;
  /** The ceiling `limited` refers to. */
  limit: number;
  /** Everyone in the period, and how many of them are identified. */
  totals: (TraitGroupStats & { identified: number }) | null;
  /** The largest values, by users. */
  groups: (TraitGroupStats & { value: string })[];
  /** Every value past the largest ones, together. */
  other: (TraitGroupStats & { values: number }) | null;
  /** Users with no value for the key: anonymous users and identified users without it. */
  none: TraitGroupStats | null;
}

/** Group rows shown before the rest are folded into `other`. */
export const MAX_TRAIT_GROUPS = 25;

const emptyStats = (): TraitGroupStats => ({ users: 0, sessions: 0, pageviews: 0, events: 0 });

const add = (stats: TraitGroupStats, row: CohortRow) => {
  stats.users += row.users;
  stats.sessions += row.sessions;
  stats.pageviews += row.pageviews;
  stats.events += row.events;
};

/**
 * Groups the period's users by their value for one trait. Every user lands in
 * exactly one of `groups`, `other` or `none`, so the parts sum to `totals`.
 */
export function groupByTraitValue(
  key: string,
  rows: CohortRow[],
  values: Map<string, string>,
  maxGroups = MAX_TRAIT_GROUPS
): TraitBreakdown {
  const totals = { ...emptyStats(), identified: 0 };
  const none = emptyStats();
  const byValue = new Map<string, TraitGroupStats>();

  for (const row of rows) {
    add(totals, row);
    if (row.identified_user_id !== "") totals.identified += row.users;

    const value = row.identified_user_id === "" ? undefined : values.get(row.identified_user_id);
    if (value === undefined) {
      add(none, row);
      continue;
    }
    let group = byValue.get(value);
    if (!group) {
      group = emptyStats();
      byValue.set(value, group);
    }
    add(group, row);
  }

  const ranked = [...byValue]
    .map(([value, stats]) => ({ value, ...stats }))
    .sort((a, b) => b.users - a.users || a.value.localeCompare(b.value));

  const rest = ranked.slice(maxGroups);
  const other = rest.length
    ? rest.reduce(
        (sum, group) => ({
          values: sum.values + 1,
          users: sum.users + group.users,
          sessions: sum.sessions + group.sessions,
          pageviews: sum.pageviews + group.pageviews,
          events: sum.events + group.events,
        }),
        { values: 0, ...emptyStats() }
      )
    : null;

  return {
    key,
    limited: false,
    limit: MAX_SCOPED_USER_IDS,
    totals,
    groups: ranked.slice(0, maxGroups),
    other,
    none,
  };
}

/**
 * The period's users grouped by one trait.
 *
 * Traits live in Postgres and activity in ClickHouse, so this is a join across
 * the two stores (see `resolveTraitCohort`). It takes the same period, filters,
 * search and quick filters as the users list, which is what keeps a group's
 * count equal to the rows that open under it.
 */
export const getUserTraitBreakdown = analyticsRoute<GetUserTraitBreakdownRequest>(
  "user trait breakdown",
  async (req: FastifyRequest<GetUserTraitBreakdownRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const { key } = req.query;

    if (!key || key.length > 200) {
      return res.status(400).send({ error: "key query parameter is required" });
    }
    const parsed = userNarrowingSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" });
    }

    const search = await resolveSearchScope(req.query, siteId);
    if (search.matchingUserIds?.length === 0) {
      return res.send({ data: { ...groupByTraitValue(key, [], new Map()), searchLimited: false } });
    }

    const cohort = await resolveTraitCohort(req.query, siteId, key, { matchingUserIds: search.matchingUserIds });
    if (cohort.limited) {
      const limited: TraitBreakdown = {
        key,
        limited: true,
        limit: MAX_SCOPED_USER_IDS,
        totals: null,
        groups: [],
        other: null,
        none: null,
      };
      return res.send({ data: { ...limited, searchLimited: search.limited } });
    }

    return res.send({
      data: { ...groupByTraitValue(key, cohort.rows, cohort.values), searchLimited: search.limited },
    });
  }
);
