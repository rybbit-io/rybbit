"use client";

import { TriangleAlert } from "lucide-react";
import { useExtracted } from "next-intl";

import type { GetOrganizationMembersResponse } from "@/api/admin/endpoints/auth";
import type { Team } from "@/api/admin/endpoints/teams";
import { Badge } from "@/components/ui/badge";
import { useRoleInfo } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { LedgerRow, LedgerRows } from "../../components/Ledger";
import { AvatarStack, PersonAvatar } from "../../components/PersonAvatar";
import { SiteAccess } from "../../components/siteAccess";

const MUTED = "text-neutral-500 dark:text-neutral-400";

type OrgMember = GetOrganizationMembersResponse["data"][number];

/**
 * One ledger row per site: who can open it, with what role, and why. The people who reach it on their
 * organization role fold into one line so the team and direct grants stand out.
 */
export function SiteAccessList({
  access,
  onEditTeam,
}: {
  access: SiteAccess<Team, OrgMember>[];
  onEditTeam: (team: Team) => void;
}) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();

  return (
    <LedgerRows>
      {access.map(({ site, teams, broad, broadReachesEverySite, scoped }) => {
        const teamsAreEmpty = teams.every(team => team.members.length === 0);
        return (
          <LedgerRow
            key={site.siteId}
            label={
              <span className="block truncate" title={site.domain}>
                {site.name}
              </span>
            }
            description={t("{count, plural, one {# person} other {# people}}", {
              count: broad.length + scoped.length,
            })}
          >
            <div className={cn("flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 text-sm", MUTED)}>
              <AvatarStack
                people={broad.map(member => ({ name: member.user.name, email: member.user.email }))}
                max={4}
                size="xs"
              />
              <span>
                {broadReachesEverySite
                  ? t("{count, plural, one {# person with all-site access} other {# people with all-site access}}", {
                      count: broad.length,
                    })
                  : t(
                      "{count, plural, one {# person reaches every site not in a team} other {# people reach every site not in a team}}",
                      { count: broad.length }
                    )}
              </span>
            </div>

            {scoped.length > 0 && (
              <ul className="mt-1">
                {scoped.map(({ member, role, sources }) => (
                  <li
                    key={member.userId}
                    className="grid min-h-[30px] grid-cols-[20px_minmax(0,1fr)_auto_auto] items-center gap-2.5 text-sm md:grid-cols-[20px_minmax(0,140px)_minmax(0,170px)_minmax(0,1fr)]"
                  >
                    <PersonAvatar person={{ name: member.user.name, email: member.user.email }} size="xs" />
                    <span className="truncate font-medium" title={member.user.email}>
                      {member.user.name || member.user.email}
                    </span>
                    <span className="truncate text-neutral-700 dark:text-neutral-300">
                      {roleInfo(role).label}
                      {role !== member.role && (
                        <span className={cn("ml-1 hidden md:inline", MUTED)}>
                          {t("from {role}", { role: roleInfo(member.role).label })}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                      {sources.map(source => (
                        <Badge
                          key={source.type === "team" ? source.teamId : "direct"}
                          variant="outline"
                          className="px-[5px] py-px text-xs leading-4 font-normal"
                        >
                          {source.type === "team" ? source.teamName : t("Direct")}
                        </Badge>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {teams.length > 0 && scoped.length === 0 && (
              <p className="mt-1 flex items-start gap-2 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-yellow-600 dark:text-yellow-500"
                />
                <span>
                  {!teamsAreEmpty
                    ? t("Only owners and admins reach this site.")
                    : teams.length > 1
                      ? t("Its teams have no members, so nobody else reaches this site.")
                      : t.rich(
                          "The {team} team has no members, so nobody else reaches this site. <link>Add people to {team}</link>",
                          {
                            team: teams[0].name,
                            link: chunks => (
                              <button
                                type="button"
                                onClick={() => onEditTeam(teams[0])}
                                className="cursor-pointer rounded-sm underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900 hover:decoration-current focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:decoration-neutral-600 dark:hover:text-neutral-100 dark:focus-visible:ring-neutral-300"
                              >
                                {chunks}
                              </button>
                            ),
                          }
                        )}
                </span>
              </p>
            )}
          </LedgerRow>
        );
      })}
    </LedgerRows>
  );
}
