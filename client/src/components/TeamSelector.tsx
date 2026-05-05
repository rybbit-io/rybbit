"use client";

import { ChevronDown, Globe, Plus, Users } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Team } from "../api/admin/endpoints/teams";
import { CreateEditTeamDialog } from "../app/settings/teams/components/CreateEditTeamDialog";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface TeamSelectorProps {
  teams: Team[];
  value: string;
  onValueChange: (value: string) => void;
  canCreateTeam?: boolean;
}

export function TeamSelector({ teams, value, onValueChange, canCreateTeam = false }: TeamSelectorProps) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);

  const selectedTeam = teams.find((t) => t.id === value);
  const displayLabel =
    value === "all"
      ? t("All Teams")
      : value === "unassigned"
        ? t("No Team")
        : selectedTeam?.name || t("All Teams");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex gap-2 items-center border border-neutral-200 dark:border-neutral-800 rounded-lg py-1.5 px-3 justify-start cursor-pointer hover:bg-neutral-150 dark:hover:bg-neutral-800/50 transition-colors h-[36px] w-[200px]">
          <Users className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
          <div className="text-neutral-900 dark:text-white truncate text-sm flex-1 text-left">
            {displayLabel}
          </div>
          <ChevronDown className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="max-h-96 overflow-y-auto">
          <div
            onClick={() => {
              onValueChange("all");
              setOpen(false);
            }}
            className={cn(
              "flex items-center p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors rounded-md",
              value === "all" && "bg-neutral-50 dark:bg-neutral-800"
            )}
          >
            <span className="text-sm text-neutral-900 dark:text-white">
              {t("All Teams")}
            </span>
          </div>
          <div
            onClick={() => {
              onValueChange("unassigned");
              setOpen(false);
            }}
            className={cn(
              "flex items-center p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors rounded-md",
              value === "unassigned" && "bg-neutral-50 dark:bg-neutral-800"
            )}
          >
            <span className="text-sm text-neutral-900 dark:text-white">
              {t("No Team")}
            </span>
          </div>
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => {
                onValueChange(team.id);
                setOpen(false);
              }}
              className={cn(
                "flex items-center justify-between p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors rounded-md border-t border-neutral-100 dark:border-neutral-800",
                value === team.id && "bg-neutral-50 dark:bg-neutral-800"
              )}
            >
              <span className="text-sm text-neutral-900 dark:text-white truncate">
                {team.name}
              </span>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <Globe className="w-3 h-3" />
                  {team.sites.length}
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <Users className="w-3 h-3" />
                  {team.members.length}
                </div>
              </div>
            </div>
          ))}
        </div>
        {canCreateTeam && (
          <div className="mt-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
            <CreateEditTeamDialog
              trigger={
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  {t("Create Team")}
                </Button>
              }
              onSuccess={() => setOpen(false)}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
