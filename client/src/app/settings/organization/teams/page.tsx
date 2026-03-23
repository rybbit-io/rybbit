"use client";

import { Globe, Plus, Users2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { Team } from "@/api/admin/endpoints/teams";
import { useTeams } from "@/api/admin/hooks/useTeams";
import { NoOrganization } from "@/components/NoOrganization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-xl">{t("Teams")}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  "Organize sites into teams to control which members can access them."
                )}
              </p>
            </div>
            <CreateEditTeamDialog
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("Create Team")}
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
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
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{team.name}</h3>
                    </div>
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
                    {team.sites.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {team.sites.slice(0, 5).map((site) => (
                          <Badge key={site.siteId} variant="secondary" className="text-xs">
                            {site.domain}
                          </Badge>
                        ))}
                        {team.sites.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{team.sites.length - 5}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTeam(team)}
                    >
                      {t("Edit")}
                    </Button>
                    <DeleteTeamDialog team={team} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
