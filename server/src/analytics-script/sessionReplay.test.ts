import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionReplayRecorder } from "./sessionReplay.js";
import type { ScriptConfig } from "./types.js";

const config: ScriptConfig = {
  namespace: "rybbit",
  analyticsHost: "https://analytics.example.com",
  siteId: "123",
  visitorId: "visitor-123",
  debounceDuration: 0,
  autoTrackPageview: true,
  autoTrackSpa: true,
  trackQuerystring: true,
  trackUrlFragments: false,
  trackOutbound: true,
  enableWebVitals: false,
  trackErrors: false,
  enableSessionReplay: true,
  sessionReplayBatchSize: 50,
  sessionReplayBatchInterval: 5000,
  sessionReplayMaskTextSelectors: [],
  skipPatterns: [],
  maskPatterns: [],
  trackButtonClicks: false,
  trackCopy: false,
  trackFormInteractions: false,
  tag: "",
  featureFlagsEnabled: false,
  featureFlags: {},
};

describe("SessionReplayRecorder identity", () => {
  let emit: (event: unknown) => void;
  let recorder: SessionReplayRecorder;
  let sendBatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    window.rrweb = {
      record: vi.fn(options => {
        emit = options.emit;
        return vi.fn();
      }),
    };

    sendBatch = vi.fn().mockResolvedValue(undefined);
    recorder = new SessionReplayRecorder(config, "employee-alice", sendBatch);
    await recorder.initialize();
  });

  afterEach(() => {
    recorder.cleanup();
    delete window.rrweb;
  });

  it("flushes buffered events before changing the identified user", async () => {
    emit({ type: 2, data: { user: "employee-alice" }, timestamp: 1_700_000_000_000 });

    recorder.updateUserId("employee-bob");

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(1));
    expect(sendBatch.mock.calls[0][0]).toMatchObject({
      userId: "employee-alice",
      events: [{ data: { user: "employee-alice" } }],
    });

    emit({ type: 2, data: { user: "employee-bob" }, timestamp: 1_700_000_001_000 });
    recorder.stopRecording();

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(2));
    expect(sendBatch.mock.calls[1][0]).toMatchObject({
      userId: "employee-bob",
      events: [{ data: { user: "employee-bob" } }],
    });
  });
});

describe("SessionReplayRecorder size cap", () => {
  let emit: (event: unknown) => void;
  let stopRrweb: ReturnType<typeof vi.fn>;
  let recorder: SessionReplayRecorder;
  let sendBatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    stopRrweb = vi.fn();
    window.rrweb = {
      record: vi.fn(options => {
        emit = options.emit;
        return stopRrweb;
      }),
    };

    sendBatch = vi.fn().mockResolvedValue({ success: true, stopRecording: true });
    recorder = new SessionReplayRecorder(config, "visitor", sendBatch);
    await recorder.initialize();
  });

  afterEach(() => {
    recorder.cleanup();
    delete window.rrweb;
  });

  it("stops recording for the page when the server reports the cap", async () => {
    emit({ type: 2, data: {}, timestamp: 1_700_000_000_000 });
    recorder.onPageChange();

    await vi.waitFor(() => expect(recorder.isActive()).toBe(false));
    expect(stopRrweb).toHaveBeenCalledOnce();

    // Neither a later restart nor cleanup sends anything more.
    recorder.startRecording();
    expect(recorder.isActive()).toBe(false);
    recorder.cleanup();
    expect(sendBatch).toHaveBeenCalledOnce();
  });
});

describe("SessionReplayRecorder retries", () => {
  let emit: (event: unknown) => void;
  let recorder: SessionReplayRecorder;
  let sendBatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    window.rrweb = {
      record: vi.fn(options => {
        emit = options.emit;
        return vi.fn();
      }),
    };

    sendBatch = vi.fn().mockResolvedValue(undefined);
    recorder = new SessionReplayRecorder(config, "employee-alice", sendBatch);
    await recorder.initialize();
  });

  afterEach(() => {
    recorder.cleanup();
    delete window.rrweb;
  });

  it("retries a failed batch under the identity it was recorded with", async () => {
    sendBatch.mockRejectedValueOnce(new Error("503"));
    emit({ type: 2, data: { user: "employee-alice" }, timestamp: 1_700_000_000_000 });

    recorder.updateUserId("employee-bob");
    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(1));

    emit({ type: 3, data: { user: "employee-bob" }, timestamp: 1_700_000_001_000 });
    recorder.onPageChange();

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(3));
    const retried = sendBatch.mock.calls.slice(1).map(([batch]) => batch);
    expect(retried).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "employee-alice", events: [expect.objectContaining({ type: 2 })] }),
        expect.objectContaining({ userId: "employee-bob", events: [expect.objectContaining({ type: 3 })] }),
      ])
    );
  });

  it("merges repeated failures from one identity and page into a single retry", async () => {
    sendBatch
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"));

    emit({ type: 2, data: {}, timestamp: 1_700_000_000_000 });
    recorder.onPageChange();
    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(1));
    emit({ type: 3, data: {}, timestamp: 1_700_000_001_000 });
    recorder.onPageChange();
    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(3));

    recorder.onPageChange();
    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(4));
    expect(sendBatch.mock.calls[3][0].events.map((event: { type: number }) => event.type)).toEqual([2, 3]);
  });
});

describe("SessionReplayRecorder page hide", () => {
  let emit: (event: unknown) => void;
  let stopRrweb: ReturnType<typeof vi.fn>;
  let recorder: SessionReplayRecorder;
  let sendBatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    stopRrweb = vi.fn();
    window.rrweb = {
      record: vi.fn(options => {
        emit = options.emit;
        return stopRrweb;
      }),
    };

    sendBatch = vi.fn().mockResolvedValue(undefined);
    recorder = new SessionReplayRecorder(config, "visitor", sendBatch);
    await recorder.initialize();
  });

  afterEach(() => {
    recorder.cleanup();
    delete window.rrweb;
  });

  it("flushes the buffer on pagehide and keeps recording", async () => {
    emit({ type: 3, data: {}, timestamp: 1_700_000_000_000 });

    window.dispatchEvent(new Event("pagehide"));

    expect(sendBatch).toHaveBeenCalledOnce();
    // A page restored from the back/forward cache carries on recording.
    expect(recorder.isActive()).toBe(true);
    expect(stopRrweb).not.toHaveBeenCalled();
  });

  it("flushes when the page becomes hidden", async () => {
    emit({ type: 3, data: {}, timestamp: 1_700_000_000_000 });
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

    document.dispatchEvent(new Event("visibilitychange"));
    visibility.mockRestore();

    expect(sendBatch).toHaveBeenCalledWith(expect.objectContaining({ events: [expect.anything()] }));
  });
});

describe("SessionReplayRecorder full snapshot requests", () => {
  let emit: (event: unknown) => void;
  let takeFullSnapshot: ReturnType<typeof vi.fn>;
  let recorder: SessionReplayRecorder;
  let sendBatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    takeFullSnapshot = vi.fn(() => {
      emit({ type: 4, data: {}, timestamp: 1_700_000_002_000 });
      emit({ type: 2, data: {}, timestamp: 1_700_000_002_000 });
    });
    window.rrweb = {
      record: Object.assign(
        vi.fn(options => {
          emit = options.emit;
          return vi.fn();
        }),
        { takeFullSnapshot }
      ),
    };

    sendBatch = vi.fn().mockResolvedValue(undefined);
    recorder = new SessionReplayRecorder(config, "visitor", sendBatch);
    await recorder.initialize();
  });

  afterEach(() => {
    recorder.cleanup();
    delete window.rrweb;
  });

  const typesSent = () =>
    sendBatch.mock.calls.map(([batch]) => batch.events.map((event: { type: number }) => event.type));

  it("sends what came before, then a batch that opens with the snapshot", async () => {
    sendBatch.mockResolvedValueOnce({ success: true, takeFullSnapshot: true });
    emit({ type: 3, data: {}, timestamp: 1_700_000_000_000 });
    recorder.onPageChange();
    emit({ type: 3, data: {}, timestamp: 1_700_000_001_000 });

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(3));
    expect(takeFullSnapshot).toHaveBeenCalledWith(true);
    expect(typesSent()).toEqual([[3], [3], [4, 2]]);
  });

  it("takes one snapshot for several batches that ask at once", async () => {
    sendBatch.mockResolvedValue({ success: true, takeFullSnapshot: true });
    emit({ type: 3, data: {}, timestamp: 1_700_000_000_000 });
    recorder.onPageChange();
    emit({ type: 3, data: {}, timestamp: 1_700_000_001_000 });
    recorder.onPageChange();

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(3));
    expect(takeFullSnapshot).toHaveBeenCalledOnce();
  });

  it("runs a request that arrives inside the cooldown once the cooldown ends", async () => {
    vi.useFakeTimers();
    try {
      // A rollover asks for a snapshot; five seconds later identify() moves the
      // visitor again and the server asks once more.
      sendBatch.mockResolvedValueOnce({ success: true, takeFullSnapshot: true });
      emit({ type: 3, data: {}, timestamp: 1_700_000_000_000 });
      recorder.onPageChange();
      await vi.advanceTimersByTimeAsync(0);
      expect(takeFullSnapshot).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5_000);
      sendBatch.mockResolvedValueOnce({ success: true, takeFullSnapshot: true });
      emit({ type: 3, data: {}, timestamp: 1_700_000_005_000 });
      recorder.onPageChange();
      await vi.advanceTimersByTimeAsync(0);
      expect(takeFullSnapshot).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5_000);
      expect(takeFullSnapshot).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores the request once recording has stopped", async () => {
    sendBatch.mockResolvedValueOnce({ success: true, takeFullSnapshot: true });
    emit({ type: 3, data: {}, timestamp: 1_700_000_000_000 });
    recorder.stopRecording();

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledOnce());
    expect(takeFullSnapshot).not.toHaveBeenCalled();
  });
});
