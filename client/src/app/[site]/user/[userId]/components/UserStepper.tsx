"use client";

import { QueryKey, QueryObserver, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { ReactNode, useEffect } from "react";
import { UsersListResponse } from "../../../../../api/analytics/endpoints";
import { Button } from "../../../../../components/ui/button";
import { useStore } from "../../../../../lib/store";
import { CachedUsersList, findUsersListPosition } from "./usersListPosition";

// The key useGetUsers declares; the rest of the key is built by the analytics
// query layer as [name, site, path, params, body].
const USERS_LIST_KEY = "users";

/**
 * "3 of 4,870 users", with the previous and next user of the Users list the
 * visitor came from. It reads the pages of that list already in the query
 * cache (whatever sort, search and page they were on) and asks for nothing: a
 * profile opened from a session card or a pasted link has no list behind it
 * and shows no stepper.
 */
export function UserStepper({ userIds }: { userIds: string[] }) {
  const t = useExtracted();
  const queryClient = useQueryClient();
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);

  const lists: (CachedUsersList & { queryKey: QueryKey })[] = queryClient
    .getQueryCache()
    .findAll({ queryKey: [USERS_LIST_KEY] })
    .filter(query => String(query.queryKey[1]) === String(site) && query.queryKey[2] === "users")
    .map(query => ({
      queryKey: query.queryKey,
      data: query.state.data as UsersListResponse | undefined,
      params: query.queryKey[3] as Record<string, unknown> | undefined,
      updatedAt: query.state.dataUpdatedAt,
    }));

  const found = findUsersListPosition(lists, userIds);
  const listKey = found?.list.queryKey;
  const listKeyHash = listKey ? JSON.stringify(listKey) : null;

  // The Users page is unmounted, so nothing observes its query and the cache
  // would drop it after a few minutes of stepping. A disabled observer keeps
  // the page of results alive without ever refetching it.
  useEffect(() => {
    if (!listKey) return;
    const observer = new QueryObserver(queryClient, { queryKey: listKey, enabled: false });
    return observer.subscribe(() => {});
    // listKeyHash stands in for listKey, which is a new array on every render.
  }, [queryClient, listKeyHash]);

  if (!found) return null;

  const hrefFor = (id: string) => {
    const base = privateKey ? `/${site}/${privateKey}` : `/${site}`;
    return `${base}/user/${encodeURIComponent(id)}`;
  };

  const values = { position: found.position.toLocaleString(), total: found.total.toLocaleString() };

  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      <span className="hidden whitespace-nowrap tabular-nums sm:inline">
        {found.identifiedOnly
          ? t("{position} of {total} identified users", values)
          : t("{position} of {total} users", values)}
      </span>
      <div className="flex items-center">
        <StepButton label={t("Previous user")} href={found.previousId ? hrefFor(found.previousId) : null}>
          <ChevronUp />
        </StepButton>
        <StepButton label={t("Next user")} href={found.nextId ? hrefFor(found.nextId) : null}>
          <ChevronDown />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({ label, href, children }: { label: string; href: string | null; children: ReactNode }) {
  if (!href) {
    return (
      <Button variant="ghost" size="xs" className="w-6 px-0" aria-label={label} title={label} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button asChild variant="ghost" size="xs" className="w-6 px-0">
      <Link href={href} aria-label={label} title={label}>
        {children}
      </Link>
    </Button>
  );
}
