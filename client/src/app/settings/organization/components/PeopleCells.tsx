"use client";

import { useExtracted } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { useRoleInfo } from "@/lib/roles";

import type { PersonAccess } from "./personAccess";

// The people table lists members and pending invitations in one run of rows. These are the pieces
// both kinds of row share.

/** A ledger row: hairline below, no hover fill (the table is read, not clicked). */
export const PEOPLE_ROW = "hover:bg-transparent dark:hover:bg-transparent dark:border-b-neutral-850";
export const PEOPLE_HEAD = "h-auto px-3 py-2";
export const PEOPLE_CELL = "h-[52px] px-3 py-2.5";
/** Cells that state a fact about the person (role, access) sit a step below their name. */
export const PEOPLE_SECONDARY = "text-neutral-700 dark:text-neutral-300";
/** Small outlined chips for the Pending state and team names. */
export const PEOPLE_CHIP = "px-1.5 py-0 text-xs leading-4";

export function PersonCell({
  avatar,
  name,
  marker,
  detail,
}: {
  avatar: React.ReactNode;
  name: string;
  /** A tag after the name, e.g. "You" or "Pending". */
  marker?: React.ReactNode;
  /** A quiet second line, e.g. the email under a name. */
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {avatar}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 whitespace-nowrap font-medium leading-[18px]">
          <span>{name}</span>
          {marker}
        </div>
        {detail && (
          <div className="whitespace-nowrap text-xs leading-4 text-neutral-500 dark:text-neutral-400">{detail}</div>
        )}
      </div>
    </div>
  );
}

export function YouMarker() {
  const t = useExtracted();
  return (
    <span className="rounded-sm border border-neutral-200 px-1 text-xs font-medium leading-4 text-neutral-500 dark:border-neutral-750 dark:text-neutral-400">
      {t("You")}
    </span>
  );
}

/**
 * Which of the organization's sites someone reaches, in words, with what raises their role there and
 * which teams or direct grants it comes through. `undefined` while sites and teams load; `null` when
 * they couldn't be loaded.
 */
export function SiteAccessSummary({ access }: { access: PersonAccess | null | undefined }) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();

  if (access === undefined) {
    return <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>;
  }
  if (access === null) {
    return <span className="text-neutral-500 dark:text-neutral-400">—</span>;
  }
  if (access.everySiteByRole) {
    return <span className="whitespace-nowrap">{t("All sites")}</span>;
  }
  if (access.reached === 0) {
    return (
      <span
        className="whitespace-nowrap text-neutral-500 dark:text-neutral-400"
        title={
          access.total > 0 ? t("Add them to a team, or give them sites directly, so they can open a site.") : undefined
        }
      >
        {t("No sites")}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="tabular-nums">
        {access.reached === access.total
          ? t("{total, plural, one {All # site} other {All # sites}}", { total: access.total })
          : t("{reached} of {total} sites", { reached: String(access.reached), total: String(access.total) })}
        {access.raised.map(({ role, sites }) => (
          <span key={role} className="text-neutral-500 dark:text-neutral-400">
            {" · "}
            {t("{role} on {count}", { role: roleInfo(role).label, count: String(sites) })}
          </span>
        ))}
      </span>
      {access.sources.map(source =>
        source.type === "team" ? (
          <Badge
            key={source.teamId}
            variant="outline"
            className={PEOPLE_CHIP}
            title={t("Access granted through this team's sites")}
          >
            {source.teamName}
          </Badge>
        ) : (
          <Badge key="direct" variant="outline" className={PEOPLE_CHIP} title={t("Sites given to them directly")}>
            {t("Direct")}
          </Badge>
        )
      )}
    </span>
  );
}
