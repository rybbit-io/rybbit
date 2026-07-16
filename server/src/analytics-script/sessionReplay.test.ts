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

  it("uses a stable batch id when retrying a failed delivery", async () => {
    sendBatch.mockRejectedValueOnce(new Error("network failed")).mockResolvedValueOnce(undefined);
    emit({ type: 2, data: { retry: true }, timestamp: 1_700_000_000_000 });

    recorder.onPageChange();
    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(1));
    const firstAttempt = sendBatch.mock.calls[0][0];

    recorder.onPageChange();
    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(2));
    const secondAttempt = sendBatch.mock.calls[1][0];

    expect(firstAttempt.batchId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(secondAttempt.batchId).toBe(firstAttempt.batchId);
    expect(secondAttempt.events).toEqual(firstAttempt.events);
  });

  it("assigns globally increasing sequence numbers across batches", async () => {
    (config as ScriptConfig).sessionReplayBatchSize = 1;
    recorder.cleanup();
    recorder = new SessionReplayRecorder(config, "employee-alice", sendBatch);
    await recorder.initialize();

    emit({ type: 3, data: { order: 1 }, timestamp: 1_700_000_000_000 });
    emit({ type: 3, data: { order: 2 }, timestamp: 1_700_000_000_000 });

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(2));
    expect(sendBatch.mock.calls.map(call => call[0].events[0].sequence)).toEqual([0, 1]);
    expect(new Set(sendBatch.mock.calls.map(call => call[0].batchId)).size).toBe(2);
  });
});
