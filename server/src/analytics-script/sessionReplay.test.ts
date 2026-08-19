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

  it("sends replay batches sequentially when a send is already in flight", async () => {
    let resolveFirstSend!: () => void;
    sendBatch.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveFirstSend = resolve;
        })
    );

    for (let index = 0; index < config.sessionReplayBatchSize * 2; index++) {
      emit({ type: 2, data: { index }, timestamp: 1_700_000_000_000 + index });
    }

    expect(sendBatch).toHaveBeenCalledTimes(1);

    resolveFirstSend();

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(2));
    expect(sendBatch.mock.calls[0][0].events).toHaveLength(config.sessionReplayBatchSize);
    expect(sendBatch.mock.calls[1][0].events).toHaveLength(config.sessionReplayBatchSize);
  });

  it("queues a partial follow-up batch captured during an active send", async () => {
    let resolveFirstSend!: () => void;
    sendBatch.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveFirstSend = resolve;
        })
    );

    for (let index = 0; index < config.sessionReplayBatchSize; index++) {
      emit({ type: 2, data: { index }, timestamp: 1_700_000_000_000 + index });
    }

    expect(sendBatch).toHaveBeenCalledTimes(1);

    emit({
      type: 2,
      data: { index: config.sessionReplayBatchSize },
      timestamp: 1_700_000_000_000 + config.sessionReplayBatchSize,
    });
    resolveFirstSend();

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(2));
    expect(sendBatch.mock.calls[1][0].events).toHaveLength(1);
  });

  it("leaves a failed replay batch queued for the timer instead of retrying immediately", async () => {
    sendBatch.mockRejectedValueOnce(new Error("endpoint unavailable"));

    for (let index = 0; index < config.sessionReplayBatchSize; index++) {
      emit({ type: 2, data: { index }, timestamp: 1_700_000_000_000 + index });
    }

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(1));
    await Promise.resolve();

    expect(sendBatch).toHaveBeenCalledTimes(1);
  });

  it("permanently stops and discards queued events when the server disables replay", () => {
    const stopRecording = vi.mocked(window.rrweb!.record).mock.results[0].value;
    emit({ type: 2, data: { value: "excluded" }, timestamp: 1_700_000_000_000 });

    recorder.disableRecording();

    expect(stopRecording).toHaveBeenCalledOnce();
    expect(recorder.isActive()).toBe(false);
    expect(sendBatch).not.toHaveBeenCalled();

    recorder.startRecording();
    expect(window.rrweb!.record).toHaveBeenCalledTimes(1);
  });
});
