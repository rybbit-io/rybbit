import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReplayStore } from "../../replayStore";
import { useReplayPlayer } from "./useReplayPlayer";

const players = vi.hoisted(() => [] as any[]);
vi.mock("rrweb-player", () => ({
  default: class {
    replayer = { destroy: vi.fn(), getCurrentTime: () => 0, config: { speed: 1 } };
    pause = vi.fn();
    addEventListener = vi.fn();
    getMetaData = vi.fn(() => ({ totalTime: 1000 }));
    getReplayer = () => this.replayer;
    $set = vi.fn();
    triggerResize = vi.fn();
    $destroy = vi.fn();
    constructor() {
      players.push(this);
    }
  },
}));

function Player({ data }: { data: { events: any[] } }) {
  const { playerContainerRef } = useReplayPlayer({ data, width: 800, height: 600 });
  return <div ref={playerContainerRef} />;
}

const initialState = useReplayStore.getState();

beforeEach(() => {
  players.length = 0;
  useReplayStore.setState(initialState, true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useReplayPlayer teardown", () => {
  it("destroys the previous player and its replayer when the recording changes or unmounts", () => {
    const view = render(<Player data={{ events: [] }} />);
    view.rerender(<Player data={{ events: [] }} />);

    expect(players).toHaveLength(2);
    expect(players[0].replayer.destroy).toHaveBeenCalledOnce();
    expect(players[0].$destroy).toHaveBeenCalledOnce();
    expect(players[1].$destroy).not.toHaveBeenCalled();
    expect(useReplayStore.getState().player).toBe(players[1]);

    view.unmount();
    expect(players[1].$destroy).toHaveBeenCalledOnce();
    expect(useReplayStore.getState().player).toBeNull();
  });

  it("does not read the duration from a player destroyed before its first tick", () => {
    vi.useFakeTimers();
    const view = render(<Player data={{ events: [] }} />);
    view.unmount();

    vi.runAllTimers();
    expect(players[0].getMetaData).not.toHaveBeenCalled();
  });
});
