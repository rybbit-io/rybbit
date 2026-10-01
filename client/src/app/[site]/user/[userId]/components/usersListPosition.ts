import { UsersListResponse, UsersResponse } from "../../../../../api/analytics/endpoints";

/** One cached page of the Users list: what the list query returned and what it was asked. */
export interface CachedUsersList {
  data: UsersListResponse | undefined;
  /** The wire params of the request: `page`, `page_size`, `identified_only`, … */
  params: Record<string, unknown> | undefined;
  /** When the page was fetched. The most recent list is the one the visitor came from. */
  updatedAt: number;
}

export interface UsersListPosition {
  /** 1-based position in the whole list, across pages. */
  position: number;
  total: number;
  identifiedOnly: boolean;
  /** Route ids of the neighbours on the same page of the list; null at its edges. */
  previousId: string | null;
  nextId: string | null;
}

// The id the Users list links a row by: the identified id when there is one.
export const userRouteId = (user: Pick<UsersResponse, "user_id" | "identified_user_id">) =>
  user.identified_user_id || user.user_id;

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Where a profile sits in the Users list the visitor last looked at, and who
 * is next to it. Reads only pages already fetched: the newest cached page that
 * contains the user wins, and a profile opened from anywhere else has no
 * position. Neighbours stop at the edges of that page rather than fetching the
 * next one.
 */
export function findUsersListPosition<T extends CachedUsersList>(
  lists: T[],
  userIds: string[]
): (UsersListPosition & { list: T }) | null {
  const ids = new Set(userIds.filter(Boolean));
  if (ids.size === 0) return null;

  const newestFirst = [...lists].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const list of newestFirst) {
    const { data, params } = list;
    if (!data?.data?.length) continue;
    const rows = data.data;

    // Matched on the id the list links by, never on the bare fingerprint: one
    // fingerprint can sit under several identified rows.
    const index = rows.findIndex(row => ids.has(userRouteId(row)));
    if (index === -1) continue;

    const page = toNumber(params?.page ?? data.page, 1);
    const pageSize = toNumber(params?.page_size ?? data.pageSize, rows.length);

    return {
      list,
      position: (page - 1) * pageSize + index + 1,
      total: Math.max(data.totalCount ?? 0, (page - 1) * pageSize + rows.length),
      identifiedOnly: params?.identified_only === true || params?.identified_only === "true",
      previousId: index > 0 ? userRouteId(rows[index - 1]) : null,
      nextId: index < rows.length - 1 ? userRouteId(rows[index + 1]) : null,
    };
  }

  return null;
}
