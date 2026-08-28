import { useParams } from "next/navigation";
import "rrweb-player/dist/style.css";
import { useShallow } from "zustand/react/shallow";
import { useGetSessionReplayEvents } from "@/api/analytics/hooks/sessionReplay/useGetSessionReplayEvents";
import { ThreeDotLoader } from "@/components/Loaders";
import { useReplayStore } from "../replayStore";
import { useReplayKeyboardShortcuts } from "./hooks/useReplayKeyboardShortcuts";
import { ReplayPlayerControls } from "./ReplayPlayerControls";
import { ReplayPlayerCore } from "./ReplayPlayerCore";
import { ReplayPlayerTopbar } from "./ReplayPlayerTopbar";

export function ReplayPlayer({ width, height, isDrawer }: { width: number; height: number; isDrawer?: boolean }) {
  const params = useParams();
  const siteId = Number(params.site);
  const { sessionId, playerReady, togglePlayback, skipBackward, skipForward } = useReplayStore(
    useShallow(s => ({
      sessionId: s.sessionId,
      playerReady: s.playerReady,
      togglePlayback: s.togglePlayback,
      skipBackward: s.skipBackward,
      skipForward: s.skipForward,
    }))
  );

  const { data, isLoading, error } = useGetSessionReplayEvents(siteId, sessionId);

  useReplayKeyboardShortcuts({
    enabled: playerReady,
    onSkipBack: skipBackward,
    onSkipForward: skipForward,
    onPlayPause: togglePlayback,
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
        <ReplayPlayerCore data={data} width={width} height={height} />
      )}
      <ReplayPlayerControls events={data?.events || []} isDrawer={isDrawer} />
    </div>
  );
}
