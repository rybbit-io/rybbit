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

  it("attaches anonymousId to batches when a persistent client id is configured", async () => {
    const persistentConfig: ScriptConfig = { ...config, persistentClientId: "visitor-abc-123" };
    const persistentSendBatch = vi.fn().mockResolvedValue(undefined);
    const persistentRecorder = new SessionReplayRecorder(persistentConfig, "", persistentSendBatch);
    await persistentRecorder.initialize();

    emit({ type: 2, data: {}, timestamp: 1_700_000_002_000 });
    persistentRecorder.stopRecording();

    await vi.waitFor(() => expect(persistentSendBatch).toHaveBeenCalledTimes(1));
    expect(persistentSendBatch.mock.calls[0][0]).toMatchObject({ anonymousId: "visitor-abc-123" });

    persistentRecorder.cleanup();
  });

  it("omits anonymousId when no persistent client id is configured", async () => {
    emit({ type: 2, data: { user: "employee-alice" }, timestamp: 1_700_000_003_000 });
    recorder.stopRecording();

    await vi.waitFor(() => expect(sendBatch).toHaveBeenCalledTimes(1));
    expect(sendBatch.mock.calls[0][0].anonymousId).toBeUndefined();
  });
});
