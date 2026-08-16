import { ALL_CLIENT_BOT_SIGNAL_BITS, CLIENT_BOT_SIGNAL_MASKS, MAX_CLIENT_BOT_SCORE } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { trackingPayloadSchema } from "./trackingPayload.js";

function pageview(fields: Record<string, unknown>) {
  return trackingPayloadSchema.safeParse({ type: "pageview", site_id: "site_abc", ...fields });
}

describe("the bot signal bounds on an ingested payload", () => {
  // The tracker's 12th signal bit (squareScreen = 2048) once exceeded a
  // hard-coded `_bsm` bound, so every event carrying it failed validation and
  // was dropped with a 400 — the whole event, not just the signal. The bound is
  // derived from the contract now, so a new bit widens it automatically.
  it("accepts a mask carrying every bit the contract defines", () => {
    expect(pageview({ _bsm: ALL_CLIENT_BOT_SIGNAL_BITS, _bs: MAX_CLIENT_BOT_SCORE }).success).toBe(true);
    expect(pageview({ _bsm: CLIENT_BOT_SIGNAL_MASKS.squareScreen }).success).toBe(true);
  });

  it("rejects a mask carrying bits the contract does not define", () => {
    expect(pageview({ _bsm: ALL_CLIENT_BOT_SIGNAL_BITS + 1 }).success).toBe(false);
  });

  it("rejects a score above the contract's ceiling", () => {
    expect(pageview({ _bs: MAX_CLIENT_BOT_SCORE }).success).toBe(true);
    expect(pageview({ _bs: MAX_CLIENT_BOT_SCORE + 1 }).success).toBe(false);
  });

  it("treats both as optional — an older tracker sends neither", () => {
    expect(pageview({}).success).toBe(true);
  });
});
