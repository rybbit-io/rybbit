import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { OVERLAY_TIMEOUT } from "./utils/replayUtils";

interface ReplayPlayerOverlayProps {
  onPlayPause: () => void;
  isPlaying: boolean;
}

export function ReplayPlayerOverlay({ onPlayPause, isPlaying }: ReplayPlayerOverlayProps) {
  // State for play/pause overlay animation
  const [showPlayPauseOverlay, setShowPlayPauseOverlay] = useState(false);
  const [overlayIcon, setOverlayIcon] = useState<"play" | "pause">("play");
  const overlayTimeoutRef = useRef<number | undefined>(undefined);

  // Cleanup overlay timeout on unmount
  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  const handlePlayPauseWithOverlay = () => {
    const newPlayingState = !isPlaying;
    onPlayPause();

    // Show overlay animation
    setOverlayIcon(newPlayingState ? "pause" : "play");
    setShowPlayPauseOverlay(true);

    // Clear existing timeout
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }

    // Hide overlay after animation
    overlayTimeoutRef.current = window.setTimeout(() => {
      setShowPlayPauseOverlay(false);
    }, OVERLAY_TIMEOUT);
  };

  return (
    <>
      {/* Clickable overlay for play/pause */}
      <div className="absolute inset-0 cursor-pointer" onClick={handlePlayPauseWithOverlay} />

      {/* Play/Pause Overlay Animation */}
      {showPlayPauseOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 rounded-full p-6 animate-in fade-in zoom-in-50 duration-200">
            {overlayIcon === "play" ? (
              <Play className="w-12 h-12 text-white" fill="currentColor" />
            ) : (
              <Pause className="w-12 h-12 text-white" fill="currentColor" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
