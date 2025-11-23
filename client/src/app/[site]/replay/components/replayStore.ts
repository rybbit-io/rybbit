import { create } from "zustand";

interface ActivityPeriod {
  start: number;
  end: number;
}

export const useReplayStore = create<{
  minDuration: number;
  setMinDuration: (minDuration: number) => void;

  // Session selection
  sessionId: string;
  setSessionId: (sessionId: string) => void;

  // Player state
  player: any;
  setPlayer: (player: any) => void;

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

  // Reset all player state when session changes
  resetPlayerState: () => void;
}>(set => ({
  minDuration: 30,
  setMinDuration: minDuration => set({ minDuration }),

  // Session selection
  sessionId: "",
  setSessionId: sessionId => set({ sessionId }),

  // Player state
  player: null,
  setPlayer: player => set({ player }),

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

  // Reset all player state when session changes
  resetPlayerState: () =>
    set({
      player: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackSpeed: "1",
      activityPeriods: [],
    }),
}));
