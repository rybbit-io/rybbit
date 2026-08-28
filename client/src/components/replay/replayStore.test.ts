import { describe, expect, it } from "vitest";

import type { SessionReplayEvent } from "@/api/analytics/endpoints";

import { createReplayStore, type ReplayPlayerAdapter, type ReplayPlayerUpdate } from "./replayStore";

class FakePlayer implements ReplayPlayerAdapter {
  duration = 0;
  listeners = new Set<(update: ReplayPlayerUpdate) => void>();
  calls = {
    play: 0,
    pause: 0,
    seek: [] as number[],
    speed: [] as number[],
  };

  play() {
    this.calls.play += 1;
  }

  pause() {
    this.calls.pause += 1;
  }

  seek(time: number) {
    this.calls.seek.push(time);
  }

  setSpeed(speed: number) {
    this.calls.speed.push(speed);
  }

  getDuration() {
    return this.duration;
  }

  subscribe(listener: (update: ReplayPlayerUpdate) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(update: ReplayPlayerUpdate) {
    for (const listener of this.listeners) listener(update);
  }
}

const events: SessionReplayEvent[] = [
  { timestamp: 1_000, type: 4, data: {} },
  { timestamp: 2_000, type: 3, data: {} },
  { timestamp: 5_000, type: 3, data: {} },
  { timestamp: 12_000, type: 3, data: {} },
];

describe("Replay Session Interface", () => {
  it("opens, resets, and closes a session without exposing its player Adapter", () => {
    const store = createReplayStore();
    const player = new FakePlayer();
    player.duration = 20_000;

    store.getState().openSession("session-a");
    const disconnect = store.getState().connectPlayer(player, events);
    store.getState().play();
    store.getState().seekTo(8_000);
    store.getState().changePlaybackSpeed(2);

    expect(store.getState()).not.toHaveProperty("player");
    expect(store.getState()).toMatchObject({
      sessionId: "session-a",
      playerReady: true,
      isPlaying: true,
      currentTime: 8_000,
      playbackSpeed: 2,
    });

    store.getState().resetPlayback();
    expect(store.getState()).toMatchObject({
      sessionId: "session-a",
      playerReady: true,
      isPlaying: false,
      currentTime: 0,
      duration: 20_000,
      playbackSpeed: 1,
    });
    expect(player.calls.seek.at(-1)).toBe(0);
    expect(player.calls.speed.at(-1)).toBe(1);

    store.getState().openSession("session-b");
    expect(store.getState()).toMatchObject({
      sessionId: "session-b",
      playerReady: false,
      currentTime: 0,
      duration: 0,
    });
    expect(player.listeners.size).toBe(0);

    store.getState().closeSession("session-a");
    expect(store.getState().sessionId).toBe("session-b");
    store.getState().closeSession("session-b");
    expect(store.getState().sessionId).toBe("");

    // A hook cleanup racing with a session change remains harmless.
    disconnect();
  });

  it("coordinates play, pause, seek, scrub, skip, and speed through the Adapter", () => {
    const store = createReplayStore();
    const player = new FakePlayer();
    player.duration = 20_000;
    store.getState().openSession("session-a");
    store.getState().connectPlayer(player, events);

    store.getState().play();
    expect(player.calls.play).toBe(1);
    expect(store.getState().isPlaying).toBe(true);

    store.getState().pause();
    expect(player.calls.pause).toBe(1);
    expect(store.getState().isPlaying).toBe(false);

    store.getState().seekTo(7_000);
    store.getState().skipBackward();
    store.getState().skipForward();
    store.getState().seekTo(30_000);
    expect(player.calls.seek.slice(-4)).toEqual([7_000, 0, 10_000, 20_000]);

    store.getState().scrubTo(25);
    expect(player.calls.pause).toBe(2);
    expect(player.calls.seek.at(-1)).toBe(5_000);
    expect(store.getState().currentTime).toBe(5_000);

    store.getState().changePlaybackSpeed(4);
    expect(player.calls.speed.at(-1)).toBe(4);
    expect(store.getState().playbackSpeed).toBe(4);
  });

  it("synchronizes player events and derives activity periods at the module Interface", () => {
    const store = createReplayStore();
    const player = new FakePlayer();
    store.getState().openSession("session-a");
    const disconnect = store.getState().connectPlayer(player, events);

    player.duration = 20_000;
    player.emit({ type: "duration", value: 20_000 });
    player.emit({ type: "playback-state", value: "playing" });
    player.emit({ type: "current-time", value: 5_000 });

    expect(store.getState()).toMatchObject({
      duration: 20_000,
      isPlaying: true,
      currentTime: 5_000,
      activityPeriods: [{ start: 1_000, end: 4_000 }],
    });

    player.emit({ type: "current-time", value: 25_000 });
    expect(player.calls.pause).toBe(1);
    expect(store.getState()).toMatchObject({ currentTime: 20_000, isPlaying: false });

    disconnect();
    player.emit({ type: "current-time", value: 2_000 });
    expect(store.getState().currentTime).toBe(20_000);
    expect(store.getState().playerReady).toBe(false);
  });

  it("restores the underlying player after a drawer player disconnects", () => {
    const store = createReplayStore();
    const pagePlayer = new FakePlayer();
    const drawerPlayer = new FakePlayer();
    pagePlayer.duration = drawerPlayer.duration = 20_000;
    store.getState().openSession("session-a");

    store.getState().connectPlayer(pagePlayer, events);
    store.getState().play();
    store.getState().seekTo(4_000);
    const disconnectDrawer = store.getState().connectPlayer(drawerPlayer, events);

    expect(pagePlayer.calls.pause).toBe(1);
    expect(drawerPlayer.calls.play).toBe(1);
    expect(drawerPlayer.calls.seek.at(-1)).toBe(4_000);

    drawerPlayer.emit({ type: "current-time", value: 7_000 });
    disconnectDrawer();

    expect(pagePlayer.calls.seek.at(-1)).toBe(7_000);
    expect(pagePlayer.calls.play).toBe(2);
    expect(store.getState().playerReady).toBe(true);
  });

  it("pauses while hidden and resumes once when visibility is restored", () => {
    const store = createReplayStore();
    const player = new FakePlayer();
    player.duration = 20_000;
    store.getState().openSession("session-a");
    store.getState().connectPlayer(player, events);
    store.getState().play();

    store.getState().setPlayerVisibility(true);
    store.getState().setPlayerVisibility(true);
    expect(player.calls.pause).toBe(1);
    expect(store.getState().isPlaying).toBe(false);

    store.getState().setPlayerVisibility(false);
    store.getState().setPlayerVisibility(false);
    expect(player.calls.play).toBe(2);
    expect(store.getState().isPlaying).toBe(true);
  });

  it("resumes the underlying player when a hidden drawer disconnects", () => {
    const store = createReplayStore();
    const pagePlayer = new FakePlayer();
    const drawerPlayer = new FakePlayer();
    pagePlayer.duration = drawerPlayer.duration = 20_000;
    store.getState().openSession("session-a");

    store.getState().connectPlayer(pagePlayer, events);
    store.getState().play();
    const disconnectDrawer = store.getState().connectPlayer(drawerPlayer, events);
    store.getState().setPlayerVisibility(true);

    disconnectDrawer();
    expect(store.getState().isPlaying).toBe(false);

    store.getState().setPlayerVisibility(false);
    expect(pagePlayer.calls.play).toBe(2);
    expect(store.getState().isPlaying).toBe(true);
  });
});
