"use client";

import { ChevronDown, Globe, Pencil, Users2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { Team } from "@/api/admin/endpoints/teams";
import { useTeams } from "@/api/admin/hooks/useTeams";
import { NoOrganization } from "@/components/NoOrganization";
import { Button } from "@/components/ui/button";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CreateEditTeamDialog } from "./components/CreateEditTeamDialog";
import { DeleteTeamDialog } from "./components/DeleteTeamDialog";

export default function TeamsPage() {
  useSetPageTitle("Organization Teams");
  const t = useExtracted();
  const { data: activeOrganization, isPending } =
    authClient.useActiveOrganization();
  const { data: teamsData, isLoading: teamsLoading } = useTeams(
    activeOrganization?.id
  );

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleExpanded = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse">{t("Loading organization...")}</div>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <NoOrganization
        message={t(
          "You need to create or be added to an organization before you can manage teams."
        )}
      />
    );
  }

  const teams = teamsData?.teams || [];

  return (
    <div className="flex flex-col gap-4">
      {teamsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">{t("No teams yet")}</p>
          <p className="text-sm mt-1">
            {t(
              "Create a team to group sites and manage member access."
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
                const isExpanded = expandedTeams.has(team.id);
                return (
                  <div
                    key={team.id}
                    className="border rounded-lg transition-colors bg-white dark:bg-neutral-900/70"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpanded(team.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            !isExpanded && "-rotate-90"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{team.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users2 className="h-3.5 w-3.5" />
                              {t("{count} members", {
                                count: String(team.members.length),
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5" />
                              {t("{count} sites", {
                                count: String(team.sites.length),
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-2 ml-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="smIcon"
                          onClick={() => setEditingTeam(team)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteTeamDialog team={team} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <Users2 className="h-3.5 w-3.5" />
                              {t("Members")}
                            </h4>
                            {team.members.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {t("No members")}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {team.members.map((member) => (
                                  <div
                                    key={member.userId}
                                    className="text-sm py-1 px-5 rounded hover:bg-muted/50"
                                  >
                                    <span>{member.userName || member.userEmail}</span>
                                    {member.userName && (
                                      <span className="text-muted-foreground ml-2 text-xs">
                                        {member.userEmail}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5" />
                              {t("Sites")}
                            </h4>
                            {team.sites.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {t("No sites")}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {team.sites.map((site) => (
                                  <div
                                    key={site.siteId}
                                    className="text-sm py-1 px-5 rounded hover:bg-muted/50"
                                  >
                                    {site.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
      )}

      {/* Edit Team Dialog */}
      <CreateEditTeamDialog
        team={editingTeam || undefined}
        open={!!editingTeam}
        onOpenChange={(open) => {
          if (!open) setEditingTeam(null);
        }}
      />
    </div>
  );
}
