"use client";

import { FilterParameter } from "@rybbit/shared";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MouseEvent } from "react";
import { UsersResponse } from "@/api/analytics/endpoints";
import { Avatar } from "@/components/Avatar";
import { ChannelIcon, extractDomain, getDisplayName } from "@/components/Channel";
import { Favicon } from "@/components/Favicon";
import { IdentifiedBadge } from "@/components/IdentifiedBadge";
import {
  BrowserTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "@/components/TooltipIcons/TooltipIcons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { addFilter, getTimezone } from "@/lib/store";
import { cn, getCountryName, getUserDisplayName } from "@/lib/utils";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { columnId, formatTraitValue, TableColumn } from "../columns";

const ANONYMOUS_ID_LENGTH = 6;

const filterBy = (event: MouseEvent, parameter: FilterParameter, value: string | undefined) => {
  // The row itself opens the profile.
  event.stopPropagation();
  if (!value) return;
  addFilter({ parameter, value: [value], type: "equals" });
};

const Dash = () => <span className="text-neutral-400 dark:text-neutral-600">–</span>;

/** Relative time that swaps to the absolute date while the row is hovered. */
function TimeCell({ value }: { value: string }) {
  const { formatRelative, formatDateTime } = useDateTimeFormat();
  const date = DateTime.fromSQL(value, { zone: "utc" }).setZone(getTimezone());
  const relative = Math.abs(date.diffNow(["minutes"]).minutes) < 1 ? "<1 min ago" : formatRelative(date);
  const absolute = formatDateTime(date, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="grid whitespace-nowrap text-neutral-700 dark:text-neutral-300">
      <span className="col-start-1 row-start-1 truncate group-hover:invisible">{relative}</span>
      <span className="invisible col-start-1 row-start-1 truncate group-hover:visible">{absolute}</span>
    </div>
  );
}

function SourceCell({ user }: { user: UsersResponse }) {
  const domain = extractDomain(user.referrer);

  return (
    <button
      type="button"
      className="flex max-w-full items-center gap-2 text-neutral-700 hover:opacity-70 dark:text-neutral-300"
      onClick={event => filterBy(event, "channel", user.channel)}
    >
      {domain ? (
        <Favicon domain={domain} className="h-4 w-4 shrink-0" />
      ) : (
        <ChannelIcon channel={user.channel} className="shrink-0 text-neutral-500 dark:text-neutral-400" />
      )}
      <span className="truncate">{domain ? getDisplayName(domain) : user.channel}</span>
    </button>
  );
}

function LocationCell({ user }: { user: UsersResponse }) {
  const t = useExtracted();
  const countryName = user.country ? getCountryName(user.country) : t("Unknown");

  return (
    <button
      type="button"
      className="flex max-w-full items-center gap-2 text-neutral-700 hover:opacity-70 dark:text-neutral-300"
      onClick={event => filterBy(event, "country", user.country)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="shrink-0">
            <CountryFlag country={user.country || ""} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{countryName}</p>
        </TooltipContent>
      </Tooltip>
      <span className="truncate">{user.city || user.region || countryName}</span>
    </button>
  );
}

function DeviceCell({ user }: { user: UsersResponse }) {
  return (
    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
      <DeviceTypeTooltipIcon
        device_type={user.device_type || ""}
        size={16}
        onClick={event => filterBy(event, "device_type", user.device_type)}
      />
      <BrowserTooltipIcon browser={user.browser || ""} onClick={event => filterBy(event, "browser", user.browser)} />
      <OperatingSystemTooltipIcon
        operating_system={user.operating_system || ""}
        onClick={event => filterBy(event, "operating_system", user.operating_system)}
      />
    </div>
  );
}

function Cell({ column, user }: { column: TableColumn; user: UsersResponse }) {
  if (column.kind === "trait") {
    const value = formatTraitValue(user.traits?.[column.key]);
    return value === null ? (
      <Dash />
    ) : (
      <div className="truncate text-neutral-700 dark:text-neutral-300" title={value}>
        {value}
      </div>
    );
  }

  switch (column.id) {
    case "last_seen":
      return <TimeCell value={user.last_seen} />;
    case "first_seen":
      return <TimeCell value={user.first_seen} />;
    case "sessions":
    case "pageviews":
    case "events":
      return <div className="text-right tabular-nums">{user[column.id].toLocaleString()}</div>;
    case "source":
      return <SourceCell user={user} />;
    case "location":
      return <LocationCell user={user} />;
    case "device":
      return <DeviceCell user={user} />;
  }
}

/**
 * One user. The whole row opens the profile; the name is the real link, so the
 * row is still reachable by keyboard and opens in a new tab the usual ways.
 * Cells that filter, and the identified badge, keep their own click.
 */
export function UserRow({
  user,
  columns,
  site,
  privateKey,
  indented = false,
}: {
  user: UsersResponse;
  columns: TableColumn[];
  site: string;
  privateKey: string | null;
  /** Under a trait group, the row steps in to sit below the group's label. */
  indented?: boolean;
}) {
  const t = useExtracted();
  const router = useRouter();

  const isIdentified = !!user.identified_user_id;
  const linkId = isIdentified ? user.identified_user_id : user.user_id;
  const base = privateKey ? `/${site}/${privateKey}` : `/${site}`;
  const href = `${base}/user/${encodeURIComponent(linkId)}`;

  const displayName = getUserDisplayName(user);
  const email = typeof user.traits?.email === "string" ? user.traits.email : "";
  // The line under the name says who this is in a second way: the email, or
  // failing that the id, unless the name already is that.
  const secondary = isIdentified
    ? [email, user.identified_user_id].find(candidate => candidate && candidate !== displayName)
    : t("Anonymous · {id}", { id: user.user_id.slice(0, ANONYMOUS_ID_LENGTH) });

  const open = (event: MouseEvent<HTMLTableRowElement>) => {
    // Clicks inside a dialog opened from the row (edit traits) bubble here through React, not the DOM.
    if (!event.currentTarget.contains(event.target as Node)) return;
    // Selecting text in a row is not a click on it.
    if (window.getSelection()?.toString()) return;
    if (event.metaKey || event.ctrlKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  };

  return (
    <tr
      className="group cursor-pointer border-b border-b-neutral-100 transition-colors hover:bg-neutral-50 dark:border-b-neutral-800 dark:hover:bg-neutral-800/20"
      onClick={open}
    >
      <td className={cn("py-1.5 pl-3 pr-2 align-middle", indented && "pl-9")}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0">
            <Avatar size={24} id={linkId} lastActiveTime={DateTime.fromSQL(user.last_seen, { zone: "utc" })} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={href}
                prefetch={false}
                className="truncate font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                title={displayName}
                onClick={event => event.stopPropagation()}
              >
                {displayName}
              </Link>
              {isIdentified && (
                <IdentifiedBadge className="px-1" traits={user.traits} userId={user.identified_user_id} />
              )}
            </div>
            {secondary && <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{secondary}</div>}
          </div>
        </div>
      </td>
      {columns.map(column => (
        <td key={columnId(column)} className="px-2 py-1.5 align-middle">
          <Cell column={column} user={user} />
        </td>
      ))}
    </tr>
  );
}
