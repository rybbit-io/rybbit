import { create } from "zustand";
import { createStore } from "zustand/vanilla";

import type { SessionReplayEvent } from "@/api/analytics/endpoints";

export interface ActivityPeriod {
  start: number;
  end: number;
}

export type ReplayPlayerUpdate =
  | { type: "current-time"; value: number }
  | { type: "duration"; value: number }
  | { type: "playback-state"; value: "playing" | "paused" };

/** The narrow seam between replay-session behavior and rrweb-player. */
export interface ReplayPlayerAdapter {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
  getDuration: () => number;
  subscribe: (listener: (update: ReplayPlayerUpdate) => void) => () => void;
}

export interface ReplayStore {
  minDuration: number;
  setMinDuration: (minDuration: number) => void;

  sessionId: string;
  playerReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  activityPeriods: ActivityPeriod[];

  openSession: (sessionId: string) => void;
  closeSession: (sessionId?: string) => void;
  resetPlayback: () => void;

  connectPlayer: (player: ReplayPlayerAdapter, events: SessionReplayEvent[]) => () => void;
  setPlayerVisibility: (hidden: boolean) => void;

  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  skipBackward: () => void;
  skipForward: () => void;
  seekTo: (time: number) => void;
  scrubTo: (percentage: number) => void;
  changePlaybackSpeed: (speed: number) => void;
}

interface PlayerConnection {
  player: ReplayPlayerAdapter;
  events: SessionReplayEvent[];
  unsubscribe: () => void;
}

const DEFAULT_PLAYBACK_SPEED = 1;
const SKIP_DURATION = 10_000;

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function calculateActivityPeriods(events: SessionReplayEvent[], totalDuration: number): ActivityPeriod[] {
  if (events.length === 0) return [];

  const interactionEvents = events.filter(event => Number(event.type) === 3);
  const periods: ActivityPeriod[] = [];
  const firstEventTime = events[0].timestamp;

  for (let index = 0; index < interactionEvents.length; index++) {
    const currentEvent = interactionEvents[index];
    const nextEvent = interactionEvents[index + 1];
    const start = currentEvent.timestamp - firstEventTime;
    const end = nextEvent ? nextEvent.timestamp - firstEventTime : totalDuration;

    if (end >= start && end - start <= 5_000) {
      periods.push({ start, end });
    }
  }

  return periods;
}

function initialPlaybackState() {
  return {
    playerReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackSpeed: DEFAULT_PLAYBACK_SPEED,
    activityPeriods: [] as ActivityPeriod[],
  };
}

const createReplayState = (
  set: (partial: Partial<ReplayStore> | ((state: ReplayStore) => Partial<ReplayStore>)) => void,
  get: () => ReplayStore
): ReplayStore => {
  let connections: PlayerConnection[] = [];
  let resumeWhenVisible = false;

  const activeConnection = () => connections.at(-1);

  const setDurationFrom = (connection: PlayerConnection, value: number) => {
    if (activeConnection() !== connection) return;

    const duration = finiteNonNegative(value);
    set(state => ({
      duration,
      currentTime: duration > 0 ? Math.min(state.currentTime, duration) : state.currentTime,
      activityPeriods: calculateActivityPeriods(connection.events, duration),
    }));
  };

  const synchronizePlayer = (connection: PlayerConnection, update: ReplayPlayerUpdate) => {
    if (activeConnection() !== connection) return;

    if (update.type === "duration") {
      setDurationFrom(connection, update.value);
      return;
    }

    if (update.type === "playback-state") {
      set({ isPlaying: update.value === "playing" });
      return;
    }

    const currentTime = finiteNonNegative(update.value);
    const { duration } = get();
    if (duration > 0 && currentTime > duration) {
      connection.player.pause();
      set({ currentTime: duration, isPlaying: false });
      return;
    }

    set({ currentTime });
  };

  const activate = (connection: PlayerConnection) => {
    const state = get();
    const duration = finiteNonNegative(connection.player.getDuration()) || state.duration;
    const currentTime = duration > 0 ? Math.min(state.currentTime, duration) : state.currentTime;

    set({
      playerReady: true,
      duration,
      currentTime,
      activityPeriods: calculateActivityPeriods(connection.events, duration),
    });

    connection.player.setSpeed(state.playbackSpeed);
    if (currentTime > 0) connection.player.seek(currentTime);
    if (state.isPlaying) connection.player.play();
  };

  const disconnectAll = () => {
    const previousConnections = connections;
    connections = [];

    for (const connection of previousConnections) {
      connection.unsubscribe();
      connection.player.pause();
    }
  };

  const pauseActive = (rememberForVisibility = false) => {
    const connection = activeConnection();
    if (!connection) return;
    if (!rememberForVisibility) resumeWhenVisible = false;
    connection.player.pause();
    set({ isPlaying: false });
  };

  const seekActive = (time: number) => {
    const connection = activeConnection();
    if (!connection) return;

    const { duration } = get();
    const upperBound = duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const currentTime = Math.min(finiteNonNegative(time), upperBound);
    connection.player.seek(currentTime);
    set({ currentTime });
  };

  return {
    minDuration: 30,
    setMinDuration: minDuration => set({ minDuration: finiteNonNegative(minDuration) }),

    sessionId: "",
    ...initialPlaybackState(),

    openSession: sessionId => {
      if (!sessionId || sessionId === get().sessionId) return;
      disconnectAll();
      resumeWhenVisible = false;
      set({ sessionId, ...initialPlaybackState() });
    },

    closeSession: sessionId => {
      if (sessionId && sessionId !== get().sessionId) return;
      disconnectAll();
      resumeWhenVisible = false;
      set({ sessionId: "", ...initialPlaybackState() });
    },

    resetPlayback: () => {
      resumeWhenVisible = false;
      const connection = activeConnection();
      connection?.player.pause();
      connection?.player.seek(0);
      connection?.player.setSpeed(DEFAULT_PLAYBACK_SPEED);

      const duration = connection ? finiteNonNegative(connection.player.getDuration()) : 0;
      set({
        ...initialPlaybackState(),
        playerReady: !!connection,
        duration,
        activityPeriods: connection ? calculateActivityPeriods(connection.events, duration) : [],
      });
    },

    connectPlayer: (player, events) => {
      const previousActive = activeConnection();
      const connection: PlayerConnection = {
        player,
        events,
        unsubscribe: () => undefined,
      };

      connections.push(connection);
      connection.unsubscribe = player.subscribe(update => synchronizePlayer(connection, update));

      // A drawer can mount a second view of the same replay. The newest player
      // becomes active while the underlying one remains available to restore.
      previousActive?.player.pause();
      activate(connection);

      let connected = true;
      return () => {
        if (!connected) return;
        connected = false;

        const wasActive = activeConnection() === connection;
        connections = connections.filter(candidate => candidate !== connection);
        connection.unsubscribe();
        connection.player.pause();

        if (!wasActive) return;
        const nextActive = activeConnection();
        if (nextActive) {
          activate(nextActive);
        } else {
          resumeWhenVisible = false;
          set({ playerReady: false, isPlaying: false });
        }
      };
    },

    setPlayerVisibility: hidden => {
      const connection = activeConnection();
      if (!connection) return;

      if (hidden) {
        if (resumeWhenVisible) return;
        resumeWhenVisible = get().isPlaying;
        if (resumeWhenVisible) pauseActive(true);
        return;
      }

      if (!resumeWhenVisible) return;
      resumeWhenVisible = false;
      setDurationFrom(connection, connection.player.getDuration());
      connection.player.play();
      set({ isPlaying: true });
    },

    play: () => {
      const connection = activeConnection();
      if (!connection) return;
      resumeWhenVisible = false;
      connection.player.play();
      set({ isPlaying: true });
    },

    pause: () => pauseActive(),

    togglePlayback: () => {
      if (get().isPlaying) {
        pauseActive();
      } else {
        get().play();
      }
    },

    skipBackward: () => seekActive(get().currentTime - SKIP_DURATION),
    skipForward: () => seekActive(get().currentTime + SKIP_DURATION),
    seekTo: seekActive,

    scrubTo: percentage => {
      const { duration } = get();
      if (!activeConnection() || duration <= 0) return;
      pauseActive();
      seekActive((Math.min(100, Math.max(0, percentage)) / 100) * duration);
    },

    changePlaybackSpeed: speed => {
      const connection = activeConnection();
      if (!connection || !Number.isFinite(speed) || speed <= 0) return;
      connection.player.setSpeed(speed);
      set({ playbackSpeed: speed });
    },
  };
};

export function createReplayStore() {
  return createStore<ReplayStore>()(createReplayState);
}

export const useReplayStore = create<ReplayStore>()(createReplayState);
