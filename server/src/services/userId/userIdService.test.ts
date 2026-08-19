import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  resolveStickyUserId: vi.fn(),
}));

vi.mock("../../lib/const.js", () => ({
  SECRET: "test-secret",
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { getConfig: mocks.getConfig },
}));

// Sticky re-attachment has its own tests; here it is a passthrough that lets us
// observe the saltScope the fingerprint was built under.
vi.mock("./stickyUserId.js", () => ({
  resolveStickyUserId: mocks.resolveStickyUserId,
}));

vi.mock("../../db/geolocation/asn.js", () => ({
  lookupAsn: vi.fn(() => null),
}));

import { userIdService } from "./userIdService.js";

const DAY_END = new Date("2026-08-14T23:59:59.900Z");
const NEXT_DAY = new Date("2026-08-15T00:00:00.100Z");

describe("userIdService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockResolvedValue({ saltUserIds: true });
    mocks.resolveStickyUserId.mockImplementation(async input => input.rawUserId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the Site Configuration when the caller does not supply saltUserIds", async () => {
    await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42);

    expect(mocks.getConfig).toHaveBeenCalledWith(42);
  });

  it("skips the Site Configuration read when the caller already knows the setting", async () => {
    await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42, { saltUserIds: true });

    expect(mocks.getConfig).not.toHaveBeenCalled();
  });

  // The event's UTC day comes from receivedAt, not from the clock at hashing
  // time — otherwise an event accepted at 23:59:59.9 gets stamped with day D
  // but fingerprinted with day D+1's salt.
  it("salts against the day the event arrived, not the day it reached the hash", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(DAY_END);
    const beforeMidnight = await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42, {
      saltUserIds: true,
      receivedAt: DAY_END,
    });

    // Ingestion crossed midnight between accepting the event and hashing it.
    vi.setSystemTime(NEXT_DAY);
    const acrossMidnight = await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42, {
      saltUserIds: true,
      receivedAt: DAY_END,
    });

    expect(acrossMidnight).toBe(beforeMidnight);
    expect(mocks.resolveStickyUserId).toHaveBeenLastCalledWith(expect.objectContaining({ saltScope: "2026-08-14" }));
  });

  it("still rotates the fingerprint for an event that genuinely belongs to the next day", async () => {
    const dayOne = await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42, {
      saltUserIds: true,
      receivedAt: DAY_END,
    });
    const dayTwo = await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42, {
      saltUserIds: true,
      receivedAt: NEXT_DAY,
    });

    expect(dayTwo).not.toBe(dayOne);
    expect(mocks.resolveStickyUserId).toHaveBeenLastCalledWith(expect.objectContaining({ saltScope: "2026-08-15" }));
  });

  it("leaves an unsalted Site's fingerprint stable across the day boundary", async () => {
    const dayOne = await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42, {
      saltUserIds: false,
      receivedAt: DAY_END,
    });
    const dayTwo = await userIdService.generateUserId("198.51.100.10", "Mozilla/5.0", 42, {
      saltUserIds: false,
      receivedAt: NEXT_DAY,
    });

    expect(dayTwo).toBe(dayOne);
    expect(mocks.resolveStickyUserId).toHaveBeenLastCalledWith(expect.objectContaining({ saltScope: "" }));
  });

  it("salts an anonymous id against the event's day too", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(DAY_END);
    const beforeMidnight = await userIdService.generateUserIdFromClientId("consented-visitor", 42, {
      saltUserIds: true,
      receivedAt: DAY_END,
    });

    vi.setSystemTime(NEXT_DAY);
    const acrossMidnight = await userIdService.generateUserIdFromClientId("consented-visitor", 42, {
      saltUserIds: true,
      receivedAt: DAY_END,
    });

    expect(acrossMidnight).toBe(beforeMidnight);
  });

  it("keeps an unsalted anonymous id independent of the day", async () => {
    const dayOne = await userIdService.generateUserIdFromClientId("consented-visitor", 42, {
      saltUserIds: false,
      receivedAt: DAY_END,
    });
    const dayTwo = await userIdService.generateUserIdFromClientId("consented-visitor", 42, {
      saltUserIds: false,
      receivedAt: NEXT_DAY,
    });

    expect(dayTwo).toBe(dayOne);
  });

  // A browser or app update changes the version tokens in the user agent. Those
  // are stripped before hashing, so the same machine keeps its identity instead
  // of being counted as a second visitor.
  it("keeps one identity across a browser update", async () => {
    const before = await userIdService.generateUserId(
      "198.51.100.10",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      42,
      { saltUserIds: false }
    );
    const after = await userIdService.generateUserId(
      "198.51.100.10",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      42,
      { saltUserIds: false }
    );

    expect(after).toBe(before);
  });

  it("still separates different browsers on one IP", async () => {
    const chrome = await userIdService.generateUserId(
      "198.51.100.10",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      42,
      { saltUserIds: false }
    );
    const firefox = await userIdService.generateUserId(
      "198.51.100.10",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
      42,
      { saltUserIds: false }
    );

    expect(firefox).not.toBe(chrome);
  });

  // Sticky re-attachment keys its candidate pool on the user agent it is given,
  // and it keeps receiving the raw string. Handing it the normalized one would
  // pool every version variant together, which cuts both ways: a pool that was
  // empty can become a single candidate (a new, unreviewed re-attachment) just
  // as easily as a single candidate can become several (an abstention). Sticky
  // is a separate merge decision with its own evidence bar, so it stays on the
  // exact string it was designed and measured against.
  it("hands sticky re-attachment the raw user agent, not the normalized one", async () => {
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    await userIdService.generateUserId("198.51.100.10", userAgent, 42, { saltUserIds: false });

    expect(mocks.resolveStickyUserId).toHaveBeenCalledWith(expect.objectContaining({ userAgent }));
  });
});
