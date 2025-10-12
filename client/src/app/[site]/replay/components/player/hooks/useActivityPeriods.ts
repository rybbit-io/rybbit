import { useEffect } from "react";
import { useReplayStore } from "../../replayStore";
import { calculateActivityPeriods } from "../utils/replayUtils";

interface UseActivityPeriodsProps {
  data: { events: any[] } | undefined;
  player: any;
}

export const useActivityPeriods = ({ data, player }: UseActivityPeriodsProps) => {
  const { setActivityPeriods } = useReplayStore();

  useEffect(() => {
    if (!data?.events || !player) return;

    // Calculate activity periods after we have duration
    const timeoutId = setTimeout(() => {
      if (!data.events || data.events.length === 0) return;

      const totalDuration = player.getMetaData().totalTime || 0;
      const periods = calculateActivityPeriods(data.events, totalDuration);
      setActivityPeriods(periods);
    }, 150); // Run after duration is set

    return () => clearTimeout(timeoutId);
  }, [data, player, setActivityPeriods]);
};
