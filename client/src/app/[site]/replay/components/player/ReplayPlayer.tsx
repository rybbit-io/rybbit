import { useParams } from "next/navigation";
import { useEffect } from "react";
import "rrweb-player/dist/style.css";
import { useGetSessionReplayEvents } from "../../../../../api/analytics/sessionReplay/useGetSessionReplayEvents";
import { ThreeDotLoader } from "../../../../../components/Loaders";
import { useReplayStore } from "../replayStore";
import { useActivityPeriods } from "./hooks/useActivityPeriods";
import { useReplayKeyboardShortcuts } from "./hooks/useReplayKeyboardShortcuts";
import { ReplayPlayerControls } from "./ReplayPlayerControls";
import { ReplayPlayerCore } from "./ReplayPlayerCore";
import { SKIP_SECONDS } from "./utils/replayUtils";
import { ReplayPlayerTopbar } from "./ReplayPlayerTopbar";

export function ReplayPlayer({ width, height }: { width: number; height: number }) {
  const params = useParams();
  const siteId = Number(params.site);
  const {
    sessionId,
    player,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    playbackSpeed,
    setPlaybackSpeed,
    activityPeriods,
    resetPlayerState,
  } = useReplayStore();

  const { data, isLoading, error } = useGetSessionReplayEvents(siteId, sessionId);

  // Reset player state when session changes
  useEffect(() => {
    resetPlayerState();
  }, [sessionId, resetPlayerState]);

  // Calculate activity periods when player and data are ready
  useActivityPeriods({ data, player });

  const handlePlayPause = () => {
    if (!player) return;

    const newPlayingState = !isPlaying;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(newPlayingState);
  };

  const handleSkipBack = () => {
    if (!player) return;
    const newTime = Math.max(0, currentTime - SKIP_SECONDS);
    player.goto(newTime);
  };

  const handleSkipForward = () => {
    if (!player) return;
    const newTime = Math.min(duration, currentTime + SKIP_SECONDS);
    player.goto(newTime);
  };

  const handleSliderChange = (value: number[]) => {
    if (!player || !duration) return;

    // Pause the player when user scrubs manually
    player.pause();
    setIsPlaying(false);

    const newTime = (value[0] / 100) * duration;
    player.goto(newTime);
    setCurrentTime(newTime);
  };

  const handleSpeedChange = (speed: string) => {
    if (!player) return;
    setPlaybackSpeed(speed);
    player.setSpeed(parseFloat(speed));
  };

  // Add keyboard shortcuts
  useReplayKeyboardShortcuts({
    player,
    onSkipBack: handleSkipBack,
    onSkipForward: handleSkipForward,
    onPlayPause: handlePlayPause,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-red-500 mb-4">Error loading replay: {(error as Error).message}</div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="bg-black h-full flex items-center justify-center">
        <ThreeDotLoader className="w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ width: width, height: height }}>
      <ReplayPlayerTopbar />
      <ReplayPlayerCore data={data} width={width} height={height} onPlayPause={handlePlayPause} isPlaying={isPlaying} />

      <ReplayPlayerControls
        player={player}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        playbackSpeed={playbackSpeed}
        activityPeriods={activityPeriods}
        events={data?.events || []}
        onPlayPause={handlePlayPause}
        onSliderChange={handleSliderChange}
        onSpeedChange={handleSpeedChange}
      />
    </div>
  );
}
