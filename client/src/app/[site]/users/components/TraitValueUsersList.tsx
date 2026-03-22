"use client";

import { useEffect, useMemo, useState } from "react";
import { useExtracted } from "next-intl";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Loader2, Search } from "lucide-react";
import { Input } from "../../../../components/ui/input";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGetUserTraitValueUsers } from "../../../../api/analytics/hooks/useGetUserTraits";
import { Avatar } from "../../../../components/Avatar";
import { IdentifiedBadge } from "../../../../components/IdentifiedBadge";
import {
  CountryFlagTooltipIcon,
  BrowserTooltipIcon,
  OperatingSystemTooltipIcon,
  DeviceTypeTooltipIcon,
} from "../../../../components/TooltipIcons/TooltipIcons";
import { getUserDisplayName } from "../../../../lib/utils";

export function TraitValueUsersList({
  traitKey,
  value,
  userCount,
}: {
  traitKey: string;
  value: string;
  userCount: number;
}) {
  const t = useExtracted();
  const [searchTerm, setSearchTerm] = useState("");
  const { site } = useParams();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetUserTraitValueUsers(traitKey, value);

  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const flattenedUsers = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.users);
  }, [data]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return flattenedUsers;
    const lower = searchTerm.toLowerCase();
    return flattenedUsers.filter((user) =>
      getUserDisplayName(user).toLowerCase().includes(lower)
    );
  }, [flattenedUsers, searchTerm]);

  useEffect(() => {
    if (
      entry?.isIntersecting &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      fetchNextPage();
    }
  }, [
    entry?.isIntersecting,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  ]);

  if (isLoading) {
    return (
      <div className="border-l border-neutral-150 dark:border-neutral-750 ml-[19px]">
        {Array.from({ length: Math.min(userCount, 10) }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-1.5 px-3 animate-pulse"
          >
            <div className="h-5 w-5 bg-neutral-200 dark:bg-neutral-800 rounded-full shrink-0" />
            <div className="w-56 shrink">
              <div
                className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded"
                style={{ width: `${20 + Math.random() * 100}px` }}
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-5 w-7 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-5 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded ml-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (flattenedUsers.length === 0) {
    return (
      <div className="pl-12 py-3 text-xs text-neutral-500 dark:text-neutral-400">
        {t("No users found")}
      </div>
    );
  }

  return (
    <div className="border-l border-neutral-150 dark:border-neutral-750 ml-[19px]">
      {flattenedUsers.length > 5 && (
        <div className="px-3 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              placeholder={t("Search users...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
      )}
      {filteredUsers.map((user, index) => {
        const isIdentified = !!user.identified_user_id;
        const linkId = isIdentified ? user.identified_user_id : user.user_id;
        const encodedLinkId = encodeURIComponent(linkId);
        const displayName = getUserDisplayName(user);

        return (
          <div
            key={`${linkId}-${index}`}
            className="flex items-center gap-3 py-1.5 px-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <Link
              href={`/${site}/user/${encodedLinkId}`}
              className="flex items-center gap-2 w-64 shrink"
              target="_blank"
            >
              <Avatar size={20} id={linkId} />
              <span
                className="truncate hover:underline"
                title={displayName}
              >
                {displayName}
              </span>
            </Link>
            <div className="flex items-center gap-1.5 shrink-0">
              {isIdentified && <IdentifiedBadge traits={user.traits} />}
              <CountryFlagTooltipIcon
                country={user.country || ""}
                city={user.city || ""}
                region={user.region || ""}
              />
              <BrowserTooltipIcon browser={user.browser || ""} />
              <OperatingSystemTooltipIcon
                operating_system={user.operating_system || ""}
              />
              <DeviceTypeTooltipIcon device_type={user.device_type || ""} />
              <span className="text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap ml-1">
                {user.sessions === 1 ? t("{count} session", { count: user.sessions.toLocaleString() }) : t("{count} sessions", { count: user.sessions.toLocaleString() })}
              </span>
            </div>
          </div>
        );
      })}
      {hasNextPage && (
        <div ref={ref} className="py-2 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("Loading more...")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
