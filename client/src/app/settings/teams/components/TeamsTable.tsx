"use client";

import { ChevronRight, Globe, Pencil, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { Fragment, useState } from "react";

import type { Team } from "@/api/admin/endpoints/teams";
import { Button } from "@/components/ui/button";
import { isAdminRole, useRoleInfo } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { LedgerTable } from "../../components/Ledger";
import { DeleteTeamDialog } from "./DeleteTeamDialog";
import { AvatarStack, EmptyAvatar, PersonAvatar } from "../../components/PersonAvatar";
import { AccessMember, SiteAccess, TeamMemberEffect, teamMemberEffects } from "../../components/siteAccess";

const TH = "h-9 px-3 text-left align-middle text-xs font-medium text-neutral-500 dark:text-neutral-400";
const TD = "h-[52px] px-3 py-2.5 align-middle";
const RULE = "border-neutral-100 dark:border-neutral-850";
const MUTED = "text-neutral-500 dark:text-neutral-400";
const STRONG = "font-medium text-neutral-900 dark:text-neutral-100";

export function TeamsTable({
  teams,
  access,
  members,
  onEdit,
}: {
  teams: Team[];
  /** Who reaches which site; undefined until members and sites have loaded. */
  access?: SiteAccess[];
  members?: AccessMember[];
  onEdit: (team: Team) => void;
}) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const roleByUser = new Map(members?.map(member => [member.userId, member.role]));

  const toggle = (teamId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  return (
    <LedgerTable>
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr>
            <th className={TH}>{t("Team")}</th>
            <th className={TH}>{t("Members")}</th>
            <th className={TH}>{t("Sites")}</th>
            <th className={TH}>{t("Role on its sites")}</th>
            <th className={TH}>
              <span className="sr-only">{t("Actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map(team => {
            const isExpanded = expanded.has(team.id);
            const siteNames = team.sites.map(site => site.name).join(", ");
            // A team gives owners and admins nothing: they already reach every site with a role above any it raises to.
            const withEverySite = team.members.filter(teamMember => isAdminRole(roleByUser.get(teamMember.userId)));

            return (
              <Fragment key={team.id}>
                <tr className={cn("cursor-pointer border-t", RULE)} onClick={() => toggle(team.id)}>
                  <td className={TD}>
                    {/* The whole row toggles; the button makes that reachable and announced by keyboard. */}
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      className="inline-flex max-w-[200px] cursor-pointer items-center gap-1.5 rounded-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300"
                    >
                      <ChevronRight
                        aria-hidden="true"
                        className={cn("size-3.5 shrink-0 transition-transform", MUTED, isExpanded && "rotate-90")}
                      />
                      <span className="truncate">{team.name}</span>
                    </button>
                  </td>
                  <td className={TD}>
                    {team.members.length === 0 ? (
                      <span className={cn("flex items-center gap-2 whitespace-nowrap", MUTED)}>
                        <EmptyAvatar />
                        {t("No members yet")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                        <AvatarStack
                          people={team.members.map(teamMember => ({
                            name: teamMember.userName,
                            email: teamMember.userEmail,
                          }))}
                          max={3}
                        />
                        {t("{count, plural, one {# person} other {# people}}", { count: team.members.length })}
                      </span>
                    )}
                  </td>
                  <td className={TD}>
                    {team.sites.length === 0 ? (
                      <span className={MUTED}>{t("No sites")}</span>
                    ) : (
                      <span className="flex max-w-[270px] items-baseline gap-2 whitespace-nowrap">
                        <span className="tabular-nums text-neutral-700 dark:text-neutral-300">{team.sites.length}</span>
                        <span className={cn("min-w-0 truncate", MUTED)} title={siteNames}>
                          {siteNames}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className={TD}>
                    <span className="block whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                      {team.siteRole
                        ? t.rich("Raises to <b>{role}</b>", {
                            role: roleInfo(team.siteRole).label,
                            b: chunks => <b className={STRONG}>{chunks}</b>,
                          })
                        : team.sites.some(site => site.role)
                          ? t("Varies by site")
                          : t("Each member's own role")}
                    </span>
                    {withEverySite.length > 0 && (
                      <span className={cn("block whitespace-nowrap text-xs leading-4", MUTED)}>
                        {withEverySite.length === 1
                          ? t("Adds nothing for {name}, who has all sites", {
                              name: withEverySite[0].userName || withEverySite[0].userEmail,
                            })
                          : t(
                              "{count, plural, one {Adds nothing for # person who has all sites} other {Adds nothing for # people who have all sites}}",
                              { count: withEverySite.length }
                            )}
                      </span>
                    )}
                  </td>
                  <td className={cn(TD, "text-right")} onClick={e => e.stopPropagation()}>
                    <span className="-mr-1.5 inline-flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="smIcon"
                        className={MUTED}
                        aria-label={t("Edit {name}", { name: team.name })}
                        onClick={() => onEdit(team)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <DeleteTeamDialog team={team} />
                    </span>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={5} className="pb-4">
                      <TeamDetail
                        team={team}
                        effects={access && members ? teamMemberEffects(team, access, members) : undefined}
                        onEdit={onEdit}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </LedgerTable>
  );
}

/** The inline panel under an expanded team: what it does for each member, and its sites. */
function TeamDetail({
  team,
  effects,
  onEdit,
}: {
  team: Team;
  effects?: TeamMemberEffect[];
  onEdit: (team: Team) => void;
}) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();
  const heading = "mb-1.5 text-xs font-medium leading-4 text-neutral-500 dark:text-neutral-400";
  const list = "divide-y divide-neutral-100 dark:divide-neutral-850";
  const addButton = cn("mt-1.5 -ml-1.5", MUTED);

  return (
    <div
      className={cn(
        "grid cursor-auto gap-x-10 gap-y-4 rounded-lg border bg-white p-4 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] dark:bg-neutral-900",
        RULE
      )}
    >
      <div className="min-w-0">
        <h4 className={heading}>{t("What {team} does for each member", { team: team.name })}</h4>
        {team.members.length === 0 ? (
          <p className={cn("py-2", MUTED)}>{t("No members yet")}</p>
        ) : (
          <ul className={list}>
            {team.members.map(teamMember => {
              const effect = effects?.find(entry => entry.userId === teamMember.userId);
              return (
                <li
                  key={teamMember.userId}
                  className="grid min-h-9 grid-cols-[24px_minmax(0,120px)_auto_minmax(0,1fr)] items-center gap-2.5"
                >
                  <PersonAvatar person={{ name: teamMember.userName, email: teamMember.userEmail }} />
                  <span className="truncate font-medium" title={teamMember.userEmail}>
                    {teamMember.userName || teamMember.userEmail}
                  </span>
                  {effect ? <MemberResult effect={effect} /> : <span className="col-span-2" />}
                </li>
              );
            })}
          </ul>
        )}
        <Button variant="ghost" size="xs" className={addButton} onClick={() => onEdit(team)}>
          <Plus className="size-3" />
          {t("Add people")}
        </Button>
      </div>

      <div className="min-w-0">
        <h4 className={heading}>
          {t("Sites")}
          <span className="ml-1.5 tabular-nums text-neutral-400 dark:text-neutral-500">{team.sites.length}</span>
        </h4>
        {team.sites.length === 0 ? (
          <p className={cn("py-2", MUTED)}>{t("No sites")}</p>
        ) : (
          <ul className={list}>
            {team.sites.map(site => (
              <li
                key={site.siteId}
                className="flex min-h-9 items-center gap-2 text-neutral-700 dark:text-neutral-300"
                title={site.domain}
              >
                <Globe aria-hidden="true" className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <span className="truncate">{site.name}</span>
              </li>
            ))}
          </ul>
        )}
        <Button variant="ghost" size="xs" className={addButton} onClick={() => onEdit(team)}>
          <Plus className="size-3" />
          {t("Add sites")}
        </Button>
      </div>

      {(team.siteRole || !team.sites.some(site => site.role)) && (
        <p className={cn("border-t pt-3 text-xs leading-4 md:col-span-2", RULE, MUTED)}>
          {team.siteRole
            ? t(
                "{team} lifts anyone below {role} to {role} on these sites. It never lowers a role, so an admin added here would stay an admin.",
                { team: team.name, role: roleInfo(team.siteRole).label }
              )
            : t(
                "Members keep their own role on these sites. Besides them, only owners, admins and people given a site directly can open them."
              )}
        </p>
      )}
    </div>
  );
}

/** One team member's outcome on the team's sites, and how much of the rest of the organization they reach. */
function MemberResult({ effect }: { effect: TeamMemberEffect }) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();
  const { orgRole } = effect;
  const strong = (chunks: React.ReactNode) => <b className={STRONG}>{chunks}</b>;

  return (
    <>
      <span className={cn("flex items-center gap-3 whitespace-nowrap", MUTED)}>
        {orgRole &&
          effect.roles.map(({ role, sites }) => (
            <span key={role}>
              {effect.hasEverySite
                ? t.rich("<b>{role}</b> on every site", { role: roleInfo(role).label, b: strong })
                : role === orgRole
                  ? t.rich("<b>{role}</b> on {count, plural, one {# site} other {# sites}}", {
                      role: roleInfo(role).label,
                      count: sites,
                      b: strong,
                    })
                  : t.rich("{from} → <b>{to}</b> on {count, plural, one {# site} other {# sites}}", {
                      from: roleInfo(orgRole).label,
                      to: roleInfo(role).label,
                      count: sites,
                      b: strong,
                    })}
            </span>
          ))}
      </span>
      <span className={cn("truncate text-xs", MUTED)}>
        {!effect.hasEverySite && effect.otherSites > 0
          ? effect.otherSitesReached === 0
            ? t("{count, plural, one {No access to the other site} other {No access to the other # sites}}", {
                count: effect.otherSites,
              })
            : t("{count, plural, one {Also # other site} other {Also # other sites}}", {
                count: effect.otherSitesReached,
              })
          : null}
      </span>
    </>
  );
}
