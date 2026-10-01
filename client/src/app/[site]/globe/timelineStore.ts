import { create } from "zustand";

export const REPLAY_SPEEDS = [1, 2, 4] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

interface TimelineStore {
  /**
   * An instant (epoch ms) inside the window being replayed. Null shows the whole
   * period. Which window it falls in is derived from the period and the window
   * size, so changing either keeps the position instead of resetting it.
   */
  currentTime: number | null;
  /** User-selected window size in minutes; null uses the default for the period. */
  manualWindowSize: number | null;
  speed: ReplaySpeed;
  /**
   * Replaying needs the period's sessions themselves, which is a large fetch.
   * It starts the first time the user plays, scrubs or asks for sessions.
   */
  sessionsRequested: boolean;
  setCurrentTime: (time: number | null) => void;
  setManualWindowSize: (size: number | null) => void;
  setSpeed: (speed: ReplaySpeed) => void;
  requestSessions: () => void;
}

export const useTimelineStore = create<TimelineStore>(set => ({
  currentTime: null,
  manualWindowSize: null,
  speed: 1,
  sessionsRequested: false,
  // Choosing a window is what replaying means, so it always needs the sessions.
  setCurrentTime: time => set(time === null ? { currentTime: null } : { currentTime: time, sessionsRequested: true }),
  setManualWindowSize: size => set({ manualWindowSize: size }),
  setSpeed: speed => set({ speed }),
  requestSessions: () => set({ sessionsRequested: true }),
}));
