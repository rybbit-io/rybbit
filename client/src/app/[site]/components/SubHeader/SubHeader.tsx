"use client";
import { Button } from "@/components/ui/button";
import { goBack, goForward, useStore } from "@/lib/store";
import { FilterParameter } from "@rybbit/shared";
import { ChevronLeft, ChevronRight, Share } from "lucide-react";
import { DateTime } from "luxon";
import { Filters } from "./Filters/Filters";

import { DateSelector } from "../../../../components/DateSelector/DateSelector";
import { Time } from "../../../../components/DateSelector/types";
import { NewFilterButton } from "./Filters/NewFilterButton";
import { LiveUserCount } from "./LiveUserCount";
import { MobileSidebar } from "../Sidebar/MobileSidebar";
import { ShareSite } from "./ShareSite";
import { authClient } from "../../../../lib/auth";

const canGoForward = (time: Time) => {
  const currentDay = DateTime.now().startOf("day");
  if (time.mode === "day") {
    return !(DateTime.fromISO(time.day).startOf("day") >= currentDay);
  }

  if (time.mode === "range") {
    return !(DateTime.fromISO(time.endDate).startOf("day") >= currentDay);
  }

  if (time.mode === "week") {
    return !(DateTime.fromISO(time.week).startOf("week") >= currentDay);
  }

  if (time.mode === "month") {
    return !(DateTime.fromISO(time.month).startOf("month") >= currentDay);
  }

  if (time.mode === "year") {
    return !(DateTime.fromISO(time.year).startOf("year") >= currentDay);
  }

  return false;
};

export function SubHeader({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const { time, setTime } = useStore();
  const session = authClient.useSession();

  return (
    <div>
      <div className="flex gap-2 justify-between">
        <div className="flex items-center gap-2">
          <MobileSidebar />
          <div className="hidden md:block">
            <NewFilterButton availableFilters={availableFilters} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LiveUserCount />
          {session.data && <ShareSite />}
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
      <div>
        <div className="md:hidden mt-3">
          <NewFilterButton availableFilters={availableFilters} />
        </div>
        <div className="mt-2">
          <Filters availableFilters={availableFilters} />
        </div>
      </div>
    </div>
  );
}
