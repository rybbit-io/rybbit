import { useEffect, useRef } from "react";
import rrwebPlayer from "rrweb-player";
import { useShallow } from "zustand/react/shallow";
import { useReplayStore } from "../../replayStore";
import { CONTROLS_HEIGHT } from "../utils/replayUtils";

interface UseReplayPlayerProps {
  data: { events: any[] } | undefined;
  width: number;
  height: number;
}

export const useReplayPlayer = ({ data, width, height }: UseReplayPlayerProps) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const { setPlayer, setCurrentTime, setIsPlaying, setDuration } = useReplayStore(
    useShallow(s => ({
      setPlayer: s.setPlayer,
      setCurrentTime: s.setCurrentTime,
      setIsPlaying: s.setIsPlaying,
      setDuration: s.setDuration,
    }))
  );

  // Store width/height in refs for the resize effect
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  widthRef.current = width;
  heightRef.current = height;

  // Initialize player when data changes
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
            width: widthRef.current,
            // subtract for the custom controls
            height: heightRef.current - CONTROLS_HEIGHT,
            autoPlay: false,
            showController: false, // We'll use custom controls
          },
        });

        playerRef.current = newPlayer;
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
        playerRef.current = null;
        setPlayer(null);
      };
    }
  }, [data, setPlayer, setCurrentTime, setIsPlaying, setDuration]);

  // Update dimensions without recreating the player
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.$set({
        width,
        height: height - CONTROLS_HEIGHT,
      });
      playerRef.current.triggerResize();
    }
  }, [width, height]);

  return { playerContainerRef };
};
