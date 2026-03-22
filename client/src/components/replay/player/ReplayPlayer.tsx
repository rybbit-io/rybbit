import { useParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import "rrweb-player/dist/style.css";
import { useShallow } from "zustand/react/shallow";
import { useGetSessionReplayEvents } from "@/api/analytics/hooks/sessionReplay/useGetSessionReplayEvents";
import { ThreeDotLoader } from "@/components/Loaders";
import { useReplayStore } from "../replayStore";
import { useActivityPeriods } from "./hooks/useActivityPeriods";
import { useReplayKeyboardShortcuts } from "./hooks/useReplayKeyboardShortcuts";
import { ReplayPlayerControls } from "./ReplayPlayerControls";
import { ReplayPlayerCore } from "./ReplayPlayerCore";
import { SKIP_SECONDS } from "./utils/replayUtils";
import { ReplayPlayerTopbar } from "./ReplayPlayerTopbar";

export function ReplayPlayer({ width, height, isDrawer }: { width: number; height: number; isDrawer?: boolean }) {
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
    setPlaybackSpeed,
    resetPlayerState,
  } = useReplayStore(
    useShallow(s => ({
      sessionId: s.sessionId,
      player: s.player,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      currentTime: s.currentTime,
      setCurrentTime: s.setCurrentTime,
      duration: s.duration,
      setPlaybackSpeed: s.setPlaybackSpeed,
      resetPlayerState: s.resetPlayerState,
    }))
  );

  const { data, isLoading, error } = useGetSessionReplayEvents(siteId, sessionId);

  // Reset player state when session changes
  useEffect(() => {
    resetPlayerState();
  }, [sessionId, resetPlayerState]);

  // Calculate activity periods when player and data are ready
  useActivityPeriods({ data, player });

  const handlePlayPause = useCallback(() => {
    if (!player) return;

    const newPlayingState = !isPlaying;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(newPlayingState);
  }, [player, isPlaying, setIsPlaying]);

  const handleSkipBack = useCallback(() => {
    if (!player) return;
    const newTime = Math.max(0, currentTime - SKIP_SECONDS);
    player.goto(newTime);
  }, [player, currentTime]);

  const handleSkipForward = useCallback(() => {
    if (!player) return;
    const newTime = Math.min(duration, currentTime + SKIP_SECONDS);
    player.goto(newTime);
  }, [player, duration, currentTime]);

  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (!player || !duration) return;

      // Pause the player when user scrubs manually
      player.pause();
      setIsPlaying(false);

      const newTime = (value[0] / 100) * duration;
      player.goto(newTime);
      setCurrentTime(newTime);
    },
    [player, duration, setIsPlaying, setCurrentTime]
  );

  const handleSpeedChange = useCallback(
    (speed: string) => {
      if (!player) return;
      setPlaybackSpeed(speed);
      player.setSpeed(parseFloat(speed));
    },
    [player, setPlaybackSpeed]
  );

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

  return (
    <div
      className="bg-black flex flex-col justify-between overflow-hidden rounded-lg"
      style={{ width: width, height: height }}
    >
      <ReplayPlayerTopbar />
      {isLoading || !data ? (
        <ThreeDotLoader className="w-full" />
      ) : (
        <ReplayPlayerCore
          data={data}
          width={width}
          height={height}
          onPlayPause={handlePlayPause}
          isPlaying={isPlaying}
        />
      )}
      <ReplayPlayerControls
        events={data?.events || []}
        onPlayPause={handlePlayPause}
        onSliderChange={handleSliderChange}
        onSpeedChange={handleSpeedChange}
        isDrawer={isDrawer}
      />
    </div>
  );
}
