"use client";

import NumberFlow from "@number-flow/react";
import { useMeasure } from "@uidotdev/usehooks";
import { useAtom } from "jotai";
import { useGetLiveUsercount } from "../../../api/analytics/useLiveUserCount";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { RealtimeChart } from "./RealtimeChart/RealtimeChart";
import { RealtimeEvents } from "./RealtimeEvents/RealtimeEvents";
import { World } from "./RealtimeGlobe/RealtimeGlobe";
import { minutesAtom, MinutesType } from "./realtimeStore";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { MobileSidebar } from "../components/Sidebar/MobileSidebar";

export default function RealtimePage() {
  useSetPageTitle("Rybbit · Realtime");
  const [ref, { width }] = useMeasure();

  const [minutes, setMinutes] = useAtom(minutesAtom);

  const { data } = useGetLiveUsercount(Number(minutes));

  return (
    <DisabledOverlay message="Realtime" featurePath="realtime">
      <div className="relative overflow-hidden" ref={ref}>
        <World width={width ?? 0} />

        <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-row gap-2 items-start">
          <MobileSidebar />
          <div className="flex flex-col p-2 md:p-3 bg-neutral-900 rounded-lg shadow-lg border border-neutral-750 w-[300px] md:w-[400px]">
            <div className="p-2">
              <div className="text-sm text-gray-400 flex gap-2 text-nowrap items-center">
                <div className="flex justify-center">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                  </span>
                </div>
                Visitors in the last{" "}
                <Select value={minutes} onValueChange={(value) => setMinutes(value as MinutesType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                    <SelectItem value="720">12 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-3xl md:text-5xl font-bold flex items-center gap-2">
                {<NumberFlow respectMotionPreference={false} value={data?.count ?? 0} />}
              </div>
            </div>
            <div className="h-[50px] md:h-[70px]">
              <RealtimeChart />
            </div>
          </div>
        </div>

        <div className="hidden md:block absolute top-4 right-4 w-[320px]">
          <RealtimeEvents />
        </div>

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Pages isRealtime />
        <Events isRealtime />
        <Referrers isRealtime />
        <Countries isRealtime />
        </div> */}
      </div>
    </DisabledOverlay>
  );
}
