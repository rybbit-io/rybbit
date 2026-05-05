"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Team } from "@/api/admin/endpoints/teams";
import { DateSelector } from "@/components/DateSelector/DateSelector";
import { TeamSelector } from "@/components/TeamSelector";
import { Button } from "@/components/ui/button";
import { canGoForward, goBack, goForward, useStore } from "@/lib/store";

export function RollupTopBar({
  teams,
  selectedTeamFilter,
  onSelectedTeamFilterChange,
}: {
  teams: Team[];
  selectedTeamFilter: string;
  onSelectedTeamFilterChange: (value: string) => void;
}) {
  const { time, setTime } = useStore();

  return (
    <div className="flex flex-wrap gap-2 justify-between items-center">
      <TeamSelector
        teams={teams}
        value={selectedTeamFilter}
        onValueChange={onSelectedTeamFilterChange}
        canCreateTeam={false}
      />
      <div className="flex items-center gap-2">
        <DateSelector time={time} setTime={setTime} />
        <div className="flex items-center">
          <Button
            variant="secondary"
            size="icon"
            onClick={goBack}
            disabled={time.mode === "past-minutes"}
            className="rounded-r-none h-8 w-8"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={goForward}
            disabled={!canGoForward(time)}
            className="rounded-l-none -ml-px h-8 w-8"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
