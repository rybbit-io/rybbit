import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReplayStore } from "./replayStore";

function fakePlayer({ currentTime = 0, totalTime = 0, speed = 1 } = {}) {
  return {
    pause: vi.fn(),
    getMetaData: () => ({ totalTime }),
    getReplayer: () => ({ getCurrentTime: () => currentTime, config: { speed } }),
  };
}

const initialState = useReplayStore.getState();

beforeEach(() => {
  useReplayStore.setState(initialState, true);
});

describe("replay player registration", () => {
  it("installs a new player with fresh playback state", () => {
    const store = useReplayStore.getState();
    store.setIsPlaying(true);
    store.setCurrentTime(30);
    store.setDuration(60);
    store.setPlaybackSpeed("2");
    store.setActivityPeriods([{ start: 0, end: 10 }]);

    const player = fakePlayer();
    store.registerPlayer(player);

    expect(useReplayStore.getState()).toMatchObject({
      player,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackSpeed: "1",
      activityPeriods: [],
    });
  });

  it("swaps players when the same view re-initialises for another session", () => {
    const store = useReplayStore.getState();
    const previous = fakePlayer();
    const next = fakePlayer();

    store.registerPlayer(previous);
    store.unregisterPlayer(previous);
    store.registerPlayer(next);

    expect(useReplayStore.getState().player).toBe(next);
    expect(useReplayStore.getState().players).toEqual([next]);
  });

  it("hands control to a maximize drawer and back to the page player when it closes", () => {
    const store = useReplayStore.getState();
    const page = fakePlayer({ currentTime: 42, totalTime: 120, speed: 2 });
    const drawer = fakePlayer({ totalTime: 120 });

    store.registerPlayer(page);
    store.registerPlayer(drawer);

    expect(page.pause).toHaveBeenCalled();
    expect(useReplayStore.getState().player).toBe(drawer);

    useReplayStore.getState().setIsPlaying(true);
    useReplayStore.getState().setCurrentTime(10);
    useReplayStore.getState().unregisterPlayer(drawer);

    expect(useReplayStore.getState()).toMatchObject({
      player: page,
      players: [page],
      isPlaying: false,
      currentTime: 42,
      duration: 120,
      playbackSpeed: "2",
    });
  });

  it("ignores teardown of a player that is not driving the controls", () => {
    const store = useReplayStore.getState();
    const page = fakePlayer();
    const drawer = fakePlayer();

    store.registerPlayer(page);
    store.registerPlayer(drawer);
    useReplayStore.getState().setCurrentTime(5);
    useReplayStore.getState().unregisterPlayer(page);

    expect(useReplayStore.getState()).toMatchObject({ player: drawer, players: [drawer], currentTime: 5 });
  });

  it("clears playback state when the last player unmounts", () => {
    const store = useReplayStore.getState();
    const player = fakePlayer();

    store.registerPlayer(player);
    useReplayStore.getState().setCurrentTime(5);
    useReplayStore.getState().setDuration(10);
    useReplayStore.getState().unregisterPlayer(player);

    expect(useReplayStore.getState()).toMatchObject({ player: null, players: [], currentTime: 0, duration: 0 });
  });
});
