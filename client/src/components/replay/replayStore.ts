import { create } from "zustand";

interface ActivityPeriod {
  start: number;
  end: number;
}

const initialPlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackSpeed: "1",
  activityPeriods: [] as ActivityPeriod[],
};

export const useReplayStore = create<{
  minDuration: number;
  setMinDuration: (minDuration: number) => void;

  // Session selection
  sessionId: string;
  setSessionId: (sessionId: string) => void;

  // Player state. More than one player can be mounted at once (the page player
  // and the maximize drawer's), so they stack and the newest drives the controls.
  player: any;
  players: any[];
  registerPlayer: (player: any) => void;
  unregisterPlayer: (player: any) => void;

  // Playback state
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;

  currentTime: number;
  setCurrentTime: (currentTime: number) => void;

  duration: number;
  setDuration: (duration: number) => void;

  playbackSpeed: string;
  setPlaybackSpeed: (speed: string) => void;

  activityPeriods: ActivityPeriod[];
  setActivityPeriods: (periods: ActivityPeriod[]) => void;
}>((set, get) => ({
  minDuration: 30,
  setMinDuration: minDuration => set({ minDuration }),

  // Session selection
  sessionId: "",
  setSessionId: sessionId => set({ sessionId }),

  // Player state
  player: null,
  players: [],
  // A new player resets playback state in the same step that installs it, so
  // nothing that runs after the player is created can null it out again.
  registerPlayer: player => {
    get().player?.pause();
    set(state => ({ ...initialPlaybackState, players: [...state.players, player], player }));
  },
  // Only the player being torn down is removed. If it was driving the controls
  // (e.g. the maximize drawer closing), the one beneath takes over where it is.
  unregisterPlayer: player =>
    set(state => {
      const players = state.players.filter(p => p !== player);
      if (state.player !== player) return { players };

      const previous = players[players.length - 1];
      if (!previous) return { ...initialPlaybackState, players, player: null };

      const replayer = previous.getReplayer();
      return {
        players,
        player: previous,
        isPlaying: false,
        currentTime: replayer.getCurrentTime(),
        duration: previous.getMetaData().totalTime,
        playbackSpeed: String(replayer.config.speed),
      };
    }),

  // Playback state
  isPlaying: false,
  setIsPlaying: isPlaying => set({ isPlaying }),

  currentTime: 0,
  setCurrentTime: currentTime => set({ currentTime }),

  duration: 0,
  setDuration: duration => set({ duration }),

  playbackSpeed: "1",
  setPlaybackSpeed: playbackSpeed => set({ playbackSpeed }),

  activityPeriods: [],
  setActivityPeriods: activityPeriods => set({ activityPeriods }),
}));
