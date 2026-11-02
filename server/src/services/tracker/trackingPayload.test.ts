import { ALL_CLIENT_BOT_SIGNAL_BITS, CLIENT_BOT_SIGNAL_MASKS, MAX_CLIENT_BOT_SCORE } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { trackingPayloadSchema, truncateUrlForStorage } from "./trackingPayload.js";

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

describe("the page metadata limits on an ingested payload", () => {
  // A long title or URL used to fail validation and drop the whole event.
  it("cuts the page's title and referrer to length instead of rejecting the event", () => {
    const result = pageview({
      page_title: "t".repeat(600),
      referrer: `https://example.com/${"r".repeat(3000)}`,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.page_title).toHaveLength(512);
    expect(result.data.referrer).toHaveLength(2048);
  });

  // Site Exclusions match the path and query string, so validation keeps them
  // whole; a parameter past the storage limit must still be seen.
  it("keeps a long path and query string whole, and cuts them only for storage", () => {
    const querystring = `?padding=${"q".repeat(3000)}&preview=1`;
    const result = pageview({ pathname: `/${"p".repeat(3000)}`, querystring });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.querystring).toBe(querystring);

    const stored = truncateUrlForStorage(result.data);
    expect(stored.pathname).toHaveLength(2048);
    expect(stored.querystring).toBe(querystring.slice(0, 2048));
  });

  it("rejects a path or query string past any real page's URL", () => {
    expect(pageview({ pathname: `/${"p".repeat(16 * 1024)}` }).success).toBe(false);
    expect(pageview({ querystring: `?${"q".repeat(16 * 1024)}` }).success).toBe(false);
  });

  it("never leaves half of a surrogate pair at the cut", () => {
    const result = pageview({ page_title: `${"t".repeat(511)}😀 more` });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.page_title).toBe("t".repeat(511));
  });

  it("keeps values within the limits as sent", () => {
    const result = pageview({ pathname: "/pricing", page_title: "Pricing 😀" });

    expect(result.success && result.data).toMatchObject({ pathname: "/pricing", page_title: "Pricing 😀" });
    expect(result.success && truncateUrlForStorage(result.data)).toBe(result.success && result.data);
  });
});
