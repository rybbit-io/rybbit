import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRunningKeys, useRunTracker } from "./useRunTracker";

let clock = 0;

beforeEach(() => {
  clock = 1_000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// A request that settles when told to, and rejects the way axios does when its signal aborts.
function deferredRequest<T>() {
  let settle: { resolve: (value: T) => void; reject: (error: unknown) => void } | undefined;
  let signal: AbortSignal | undefined;
  const execute = vi.fn((requestSignal: AbortSignal) => {
    signal = requestSignal;
    return new Promise<T>((resolve, reject) => {
      settle = { resolve, reject };
      requestSignal.addEventListener("abort", () =>
        reject(Object.assign(new Error("canceled"), { name: "CanceledError", code: "ERR_CANCELED" }))
      );
    });
  });
  return {
    execute,
    resolve: (value: T) => settle?.resolve(value),
    reject: (error: unknown) => settle?.reject(error),
    get signal() {
      return signal;
    },
  };
}

function setup() {
  const hook = renderHook(() => useRunTracker());
  const onDone = vi.fn();
  const onFailed = vi.fn();
  let pending: Promise<void> = Promise.resolve();
  const start = <T,>(key: string, execute: (signal: AbortSignal) => Promise<T>) => {
    act(() => {
      pending = hook.result.current.start(key, execute, { onDone, onFailed });
    });
  };
  const settleAll = () =>
    act(async () => {
      await pending;
    });
  return { ...hook, onDone, onFailed, start, settleAll };
}

describe("useRunTracker", () => {
  it("records a finished run with its duration and hands over the value", async () => {
    const { result, onDone, onFailed, start, settleAll } = setup();
    const request = deferredRequest<string>();

    start("tab-1", request.execute);
    expect(result.current.runs["tab-1"]).toEqual({ status: "running", startedAt: 1_000 });
    expect(result.current.isRunning("tab-1")).toBe(true);

    clock = 13_400;
    request.resolve("rows");
    await settleAll();

    expect(result.current.runs["tab-1"]).toEqual({ status: "done", durationMs: 12_400 });
    expect(onDone).toHaveBeenCalledWith("rows", 12_400);
    expect(onFailed).not.toHaveBeenCalled();
    expect(result.current.isRunning("tab-1")).toBe(false);
  });

  it("records a failure with its duration and reports the error", async () => {
    const { result, onDone, onFailed, start, settleAll } = setup();
    const request = deferredRequest<string>();
    const error = new Error("Unknown column");

    start("tab-1", request.execute);
    clock = 3_000;
    request.reject(error);
    await settleAll();

    expect(result.current.runs["tab-1"]).toEqual({ status: "failed", durationMs: 2_000 });
    expect(onFailed).toHaveBeenCalledWith(error, 2_000);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("cancel aborts the request, marks the run cancelled at once and calls neither handler", async () => {
    const { result, onDone, onFailed, start, settleAll } = setup();
    const request = deferredRequest<string>();

    start("tab-1", request.execute);
    act(() => result.current.cancel("tab-1"));

    expect(request.signal?.aborted).toBe(true);
    expect(result.current.runs["tab-1"]).toEqual({ status: "cancelled" });
    expect(result.current.isRunning("tab-1")).toBe(false);

    await settleAll();
    expect(result.current.runs["tab-1"]).toEqual({ status: "cancelled" });
    expect(onDone).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("lets a cancel win over a response that lands in the same tick", async () => {
    const { result, onDone, start, settleAll } = setup();

    start("tab-1", () => Promise.resolve("rows"));
    act(() => result.current.cancel("tab-1"));
    await settleAll();

    expect(result.current.runs["tab-1"]).toEqual({ status: "cancelled" });
    expect(onDone).not.toHaveBeenCalled();
  });

  it("cancels even when the request ignores its signal", async () => {
    const { result, onDone, start, settleAll } = setup();
    let resolve: (value: string) => void = () => {};

    start("tab-1", () => new Promise<string>(done => (resolve = done)));
    act(() => result.current.cancel("tab-1"));
    expect(result.current.runs["tab-1"]).toEqual({ status: "cancelled" });

    resolve("rows");
    await settleAll();
    expect(result.current.runs["tab-1"]).toEqual({ status: "cancelled" });
    expect(onDone).not.toHaveBeenCalled();
  });

  it("can start again right after a cancel without the old run clobbering the new one", async () => {
    const { result, onDone, start, settleAll } = setup();
    const first = deferredRequest<string>();
    const second = deferredRequest<string>();

    start("tab-1", first.execute);
    act(() => result.current.cancel("tab-1"));
    start("tab-1", second.execute);
    expect(second.execute).toHaveBeenCalledOnce();

    clock = 2_500;
    second.resolve("fresh rows");
    await settleAll();

    expect(result.current.runs["tab-1"]).toEqual({ status: "done", durationMs: 1_500 });
    expect(onDone).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith("fresh rows", 1_500);
  });

  it("ignores a second start for a key that is still running", () => {
    const { start } = setup();
    const first = deferredRequest<string>();
    const second = deferredRequest<string>();

    start("tab-1", first.execute);
    start("tab-1", second.execute);

    expect(first.execute).toHaveBeenCalledOnce();
    expect(second.execute).not.toHaveBeenCalled();
  });

  it("keeps tabs independent", () => {
    const { result, start } = setup();

    start("tab-1", deferredRequest<string>().execute);
    start("tab-2", deferredRequest<string>().execute);
    act(() => result.current.cancel("tab-1"));

    expect(getRunningKeys(result.current.runs)).toEqual(new Set(["tab-2"]));
  });

  it("remove aborts silently and a late outcome cannot bring the tab back", async () => {
    const { result, onDone, onFailed, start, settleAll } = setup();
    const request = deferredRequest<string>();

    start("tab-1", request.execute);
    act(() => result.current.remove("tab-1"));
    await settleAll();

    expect(request.signal?.aborted).toBe(true);
    expect(result.current.runs).toEqual({});
    expect(onDone).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("aborts in-flight runs on unmount", async () => {
    const { unmount, onDone, onFailed, start, settleAll } = setup();
    const request = deferredRequest<string>();

    start("tab-1", request.execute);
    unmount();
    await settleAll();

    expect(request.signal?.aborted).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });
});
