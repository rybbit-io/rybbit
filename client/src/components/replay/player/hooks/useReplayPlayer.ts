import type { SessionReplayEvent } from "@/api/analytics/endpoints";
import { useEffect, useRef } from "react";
import rrwebPlayer from "rrweb-player";
import { useShallow } from "zustand/react/shallow";

import { type ReplayPlayerAdapter, type ReplayPlayerUpdate, useReplayStore } from "../../replayStore";
import { CONTROLS_HEIGHT } from "../utils/replayUtils";

interface UseReplayPlayerProps {
  data: { events: SessionReplayEvent[] } | undefined;
  width: number;
  height: number;
}

interface RrwebPlayerEvent {
  payload?: unknown;
}

interface RrwebPlayerInstance {
  $set: (dimensions: { width: number; height: number }) => void;
  addEventListener: (event: string, listener: (event: RrwebPlayerEvent) => void) => void;
  getMetaData: () => { totalTime?: number };
  goto: (time: number) => void;
  pause: () => void;
  play: () => void;
  setSpeed: (speed: number) => void;
  triggerResize: () => void;
}

function numericPayload(event: RrwebPlayerEvent): number | undefined {
  return typeof event.payload === "number" && Number.isFinite(event.payload) ? event.payload : undefined;
}

function createPlayerAdapter(player: RrwebPlayerInstance): ReplayPlayerAdapter {
  return {
    play: () => player.play(),
    pause: () => player.pause(),
    seek: time => player.goto(time),
    setSpeed: speed => player.setSpeed(speed),
    getDuration: () => player.getMetaData().totalTime ?? 0,
    subscribe: listener => {
      let subscribed = true;
      const emit = (update: ReplayPlayerUpdate) => {
        if (subscribed) listener(update);
      };

      player.addEventListener("ui-update-current-time", event => {
        const value = numericPayload(event);
        if (value !== undefined) emit({ type: "current-time", value });
      });
      player.addEventListener("ui-update-player-state", event => {
        if (event.payload === "playing" || event.payload === "paused") {
          emit({ type: "playback-state", value: event.payload });
        }
      });
      player.addEventListener("ui-update-duration", event => {
        const value = numericPayload(event);
        if (value !== undefined) emit({ type: "duration", value });
      });

      // rrweb can initialize its metadata after its first duration event, so
      // perform one delayed synchronization through the same Adapter stream.
      const durationTimeout = window.setTimeout(() => {
        const duration = player.getMetaData().totalTime;
        if (duration) emit({ type: "duration", value: duration });
      }, 100);

      return () => {
        subscribed = false;
        window.clearTimeout(durationTimeout);
      };
    },
  };
}

export const useReplayPlayer = ({ data, width, height }: UseReplayPlayerProps) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<RrwebPlayerInstance | null>(null);
  const { connectPlayer, setPlayerVisibility } = useReplayStore(
    useShallow(state => ({
      connectPlayer: state.connectPlayer,
      setPlayerVisibility: state.setPlayerVisibility,
    }))
  );

  const widthRef = useRef(width);
  const heightRef = useRef(height);
  widthRef.current = width;
  heightRef.current = height;

  useEffect(() => {
    const events = data?.events;
    const playerContainer = playerContainerRef.current;
    if (!events || !playerContainer) return;

    playerContainer.innerHTML = "";
    let player: RrwebPlayerInstance;

    try {
      player = new rrwebPlayer({
        target: playerContainer,
        props: {
          events: events as unknown as ConstructorParameters<typeof rrwebPlayer>[0]["props"]["events"],
          width: widthRef.current,
          height: heightRef.current - CONTROLS_HEIGHT,
          autoPlay: false,
          showController: false,
        },
      }) as unknown as RrwebPlayerInstance;
    } catch (error) {
      console.error("Failed to initialize rrweb player:", error);
      return;
    }

    playerRef.current = player;
    const disconnectPlayer = connectPlayer(createPlayerAdapter(player), events);
    const handleVisibilityChange = () => setPlayerVisibility(document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      disconnectPlayer();
      playerContainer.innerHTML = "";
      playerRef.current = null;
    };
  }, [connectPlayer, data?.events, setPlayerVisibility]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.$set({
      width,
      height: height - CONTROLS_HEIGHT,
    });
    playerRef.current.triggerResize();
  }, [width, height]);

  return { playerContainerRef };
};
