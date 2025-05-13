"use client";
import { Filters } from "./Filters/Filters";

import { Button } from "@/components/ui/button";
import { FilterParameter, goBack, goForward, useStore } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DateTime } from "luxon";

import { DateSelector } from "../../../../components/DateSelector/DateSelector";
import { Time } from "../../../../components/DateSelector/types";
import { MobileSidebar } from "../../../../components/MobileSidebar";
import { useWindowSize } from "@uidotdev/usehooks";

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

export function SubHeader({
  availableFilters,
}: {
  availableFilters?: FilterParameter[];
}) {
  const { time, setTime } = useStore();
  // const { width } = useWindowSize();

  // if (width && width < 768) {
  //   return (
  //     <div className="flex flex-col relative">
  //       <div className="flex gap-2 mb-2 justify-between sticky top-0 z-10 bg-background">
  //         <div className="flex items-center gap-2">
  //           <MobileSidebar />
  //         </div>
  //         <div className="flex items-center gap-2">
  //           <DateSelector time={time} setTime={setTime} />
  //           <div className="flex items-center">
  //             <Button
  //               variant="outline"
  //               size="icon"
  //               onClick={goBack}
  //               className="rounded-r-none h-8 w-8 sm:h-9 sm:w-9"
  //             >
  //               <ChevronLeft />
  //             </Button>
  //             <Button
  //               variant="outline"
  //               size="icon"
  //               onClick={goForward}
  //               disabled={!canGoForward(time)}
  //               className="rounded-l-none -ml-px h-8 w-8 sm:h-9 sm:w-9"
  //             >
  //               <ChevronRight />
  //             </Button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div>
      <div className="flex gap-2 mb-2 justify-between">
        <div className="flex items-center gap-2">
          <MobileSidebar />
          <div className="hidden md:block">
            <Filters availableFilters={availableFilters} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DateSelector time={time} setTime={setTime} />
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={goBack}
              disabled={time.mode === "last-24-hours"}
              className="rounded-r-none h-8 w-8 sm:h-9 sm:w-9"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goForward}
              disabled={!canGoForward(time)}
              className="rounded-l-none -ml-px h-8 w-8 sm:h-9 sm:w-9"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
      <div className=" md:hidden">
        <Filters availableFilters={availableFilters} />
      </div>
    </div>
  );
}
