import { useEffect, useRef, useState } from "react";
import { isAbortError } from "./utils";

export type TrackedRun =
  | { status: "running"; startedAt: number }
  | { status: "done"; durationMs: number }
  | { status: "failed"; durationMs: number }
  | { status: "cancelled" };

type RunHandlers<T> = {
  onDone?: (value: T, durationMs: number) => void;
  onFailed?: (error: unknown, durationMs: number) => void;
};

export function getRunningKeys(runs: Record<string, TrackedRun>) {
  return new Set(Object.keys(runs).filter(key => runs[key]?.status === "running"));
}

/**
 * One abortable async task per key (a query tab): when it started, how it ended, how long it took.
 *
 * `cancel` aborts the task's signal and marks it cancelled right away. Neither handler runs, even
 * if the response lands in the same tick, so the caller's data stays exactly as it was before the
 * run. `remove` (closing a tab) and unmounting abort silently.
 */
export function useRunTracker() {
  const [runs, setRuns] = useState<Record<string, TrackedRun>>({});
  const controllersRef = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach(controller => controller.abort());
      controllers.clear();
    };
  }, []);

  const isRunning = (key: string) => controllersRef.current.has(key);

  // Aborts the key's in-flight task and forgets it, so its late outcome is ignored.
  const abort = (key: string) => {
    const controller = controllersRef.current.get(key);
    if (!controller) return false;
    controller.abort();
    controllersRef.current.delete(key);
    return true;
  };

  const start = async <T>(key: string, execute: (signal: AbortSignal) => Promise<T>, handlers: RunHandlers<T> = {}) => {
    if (controllersRef.current.has(key)) return;

    const controller = new AbortController();
    controllersRef.current.set(key, controller);
    const startedAt = performance.now();
    const running: TrackedRun = { status: "running", startedAt };
    setRuns(current => ({ ...current, [key]: running }));

    // Only this run, while it is still the current one for its key, may record an outcome.
    const settle = (next: TrackedRun) => {
      setRuns(current => (current[key] === running ? { ...current, [key]: next } : current));
    };

    try {
      const value = await execute(controller.signal);
      if (controller.signal.aborted) return;
      const durationMs = performance.now() - startedAt;
      settle({ status: "done", durationMs });
      handlers.onDone?.(value, durationMs);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (isAbortError(error)) {
        settle({ status: "cancelled" });
        return;
      }
      const durationMs = performance.now() - startedAt;
      settle({ status: "failed", durationMs });
      handlers.onFailed?.(error, durationMs);
    } finally {
      if (controllersRef.current.get(key) === controller) {
        controllersRef.current.delete(key);
      }
    }
  };

  const cancel = (key: string) => {
    if (!abort(key)) return;
    setRuns(current => (current[key]?.status === "running" ? { ...current, [key]: { status: "cancelled" } } : current));
  };

  const remove = (key: string) => {
    abort(key);
    setRuns(current => {
      if (!(key in current)) return current;
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  };

  return { runs, isRunning, start, cancel, remove };
}
