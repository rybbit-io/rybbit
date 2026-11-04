import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TotalTrackingPayload } from "../utils.js";
import type { BotEventProperties } from "./index.js";

const mocks = vi.hoisted(() => ({ insert: vi.fn(), getLocation: vi.fn() }));
vi.mock("../../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { insert: mocks.insert } }));
vi.mock("../../../db/geolocation/geolocation.js", () => ({ getLocation: mocks.getLocation }));

vi.useFakeTimers();
const { botEventQueue } = await import("./botEventQueue.js");

describe("bot event geolocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockResolvedValue(undefined);
    mocks.getLocation.mockResolvedValue({ "203.0.113.8": { countryIso: "DE", city: "Berlin", latitude: 52 } });
  });

  it("uses per-event Cloudflare data and falls back to GeoLite2 without it", async () => {
    const bot: BotEventProperties = {
      isBot: true,
      detectedUaPattern: true,
      detectedHeaderHeuristics: false,
      detectedClientSignals: false,
      detectedBotAsn: false,
      detectedRateAnomaly: false,
      matchedUaPattern: "bot",
      botCategory: "crawler",
      botName: "test",
      botOperator: "test",
      botPurpose: "search",
      asnProvider: "",
      anomalyReasons: "",
      anomalyScore: 0,
    };
    const tracking = {
      site_id: 42,
      ipAddress: "203.0.113.8",
      timestamp: "2026-09-18T00:00:00Z",
      ua: { browser: {}, os: {} },
      userId: "test",
      sessionId: "test",
      hostname: "example.com",
    } as TotalTrackingPayload & { sessionId: string };
    const payload = { ...tracking, ...bot };
    await botEventQueue.add({ ...payload, location: { countryIso: "TW", region: "TPE", city: "Taipei", latitude: 0 } });
    await botEventQueue.add(payload);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.insert.mock.calls[0][0].values).toEqual([
      expect.objectContaining({ country: "TW", region: "TW-TPE", city: "Taipei", lat: 0 }),
      expect.objectContaining({ country: "DE", city: "Berlin", lat: 52 }),
    ]);
  });
});
