import { ActivitySlider } from "@/components/ui/activity-slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Maximize2, Pause, Play } from "lucide-react";
import { useState } from "react";
import { ReplayDrawer } from "../../Sessions/ReplayDrawer";
import { useReplayStore } from "../replayStore";
import { formatTime, PLAYBACK_SPEEDS } from "./utils/replayUtils";

interface ReplayPlayerControlsProps {
  events: any[];
  onPlayPause: () => void;
  onSliderChange: (value: number[]) => void;
  onSpeedChange: (speed: string) => void;
  isDrawer?: boolean;
}

export function ReplayPlayerControls({
  events,
  onPlayPause,
  onSliderChange,
  onSpeedChange,
  isDrawer,
}: ReplayPlayerControlsProps) {
  const { sessionId, player, isPlaying, currentTime, duration, playbackSpeed, activityPeriods } = useReplayStore();
  const [replayDrawerOpen, setReplayDrawerOpen] = useState(false);

  return (
    <div className="border border-neutral-100 dark:border-neutral-800 p-2 pb-3 bg-white dark:bg-neutral-900 rounded-b-lg pt-6">
      <div className="flex items-center">
        <Button variant="ghost" size="smIcon" onClick={onPlayPause} disabled={!player}>
          {isPlaying ? (
            <Pause className="w-4 h-4" fill="currentColor" />
          ) : (
            <Play className="w-4 h-4" fill="currentColor" />
          )}
        </Button>
        <div className="flex-1 mx-2 -mt-8">
          <ActivitySlider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={onSliderChange}
            max={100}
            step={0.1}
            activityPeriods={activityPeriods}
            duration={duration}
            events={events}
            className="w-full"
          />
        </div>
        <div className="text-xs text-neutral-700 dark:text-neutral-300 w-20 text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <Select value={playbackSpeed} onValueChange={onSpeedChange}>
          <SelectTrigger size="sm" className="w-14 mx-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent size="sm">
            {PLAYBACK_SPEEDS.map(speed => (
              <SelectItem key={speed.value} value={speed.value} size="sm">
                {speed.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isDrawer && (
          <Button variant="ghost" size="smIcon" onClick={() => setReplayDrawerOpen(true)}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
        <ReplayDrawer sessionId={sessionId} open={replayDrawerOpen} onOpenChange={setReplayDrawerOpen} />
      </div>
    </div>
  );
}
