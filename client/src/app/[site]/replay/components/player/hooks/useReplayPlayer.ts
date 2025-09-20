import { useEffect, useRef } from "react";
import rrwebPlayer from "rrweb-player";
import { useReplayStore } from "../../replayStore";
import { CONTROLS_HEIGHT } from "../utils/replayUtils";

interface UseReplayPlayerProps {
  data: { events: any[] } | undefined;
  width: number;
  height: number;
}

export const useReplayPlayer = ({ data, width, height }: UseReplayPlayerProps) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const { setPlayer, setCurrentTime, setIsPlaying, setDuration, setActivityPeriods } = useReplayStore();

  useEffect(() => {
    if (data?.events && playerContainerRef.current) {
      // Clear any existing content first
      playerContainerRef.current.innerHTML = "";

      let newPlayer: any = null;
      let handleVisibilityChange: (() => void) | null = null;

      try {
        // Initialize rrweb player
        newPlayer = new rrwebPlayer({
          target: playerContainerRef.current,
          props: {
            events: data.events as any, // Cast to any to handle type compatibility with rrweb
            width: width,
            // subtract for the custom controls
            height: height - CONTROLS_HEIGHT,
            autoPlay: false,
            showController: false, // We'll use custom controls
          },
        });

        setPlayer(newPlayer);

        // Set up event listeners
        newPlayer.addEventListener("ui-update-current-time", (event: any) => {
          // Validate that current time doesn't exceed duration
          const currentTime = event.payload;
          const playerDuration = newPlayer.getMetaData().totalTime;

          if (playerDuration && currentTime > playerDuration) {
            // If we've exceeded duration, pause and set to end
            newPlayer.pause();
            setCurrentTime(playerDuration);
            setIsPlaying(false);
          } else {
            setCurrentTime(currentTime);
          }
        });

        newPlayer.addEventListener("ui-update-player-state", (event: any) => {
          setIsPlaying(event.payload === "playing");
        });

        newPlayer.addEventListener("ui-update-duration", (event: any) => {
          setDuration(event.payload);
        });

        // Get the initial duration from the player
        setTimeout(() => {
          const playerDuration = newPlayer.getMetaData().totalTime;
          if (playerDuration) {
            setDuration(playerDuration);
          }
        }, 100);

        // Handle page visibility changes to prevent tab-switching issues
        let wasPlayingBeforeHidden = false;

        handleVisibilityChange = () => {
          if (document.hidden) {
            // Tab became hidden - pause if playing and remember state
            if (newPlayer && setIsPlaying) {
              const playerState = newPlayer.getMetaData();
              wasPlayingBeforeHidden = playerState?.isPlaying || false;
              if (wasPlayingBeforeHidden) {
                newPlayer.pause();
                setIsPlaying(false);
              }
            }
          } else {
            // Tab became visible - resume if it was playing before
            if (newPlayer && wasPlayingBeforeHidden) {
              // Re-sync duration in case it got corrupted
              const playerDuration = newPlayer.getMetaData().totalTime;
              if (playerDuration) {
                setDuration(playerDuration);
              }

              // Resume playback
              newPlayer.play();
              setIsPlaying(true);
              wasPlayingBeforeHidden = false;
            }
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
      } catch (error) {
        console.error("Failed to initialize rrweb player:", error);
        return;
      }

      return () => {
        // Proper cleanup
        if (newPlayer) {
          newPlayer.pause();
        }
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = "";
        }
        if (handleVisibilityChange) {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
        setPlayer(null);
      };
    }
  }, [data, width, height, setPlayer, setCurrentTime, setIsPlaying, setDuration, setActivityPeriods]);

  return { playerContainerRef };
};
