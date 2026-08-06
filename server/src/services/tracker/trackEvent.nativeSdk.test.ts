import { describe, expect, it } from "vitest";
import { trackingPayloadSchema } from "./trackEvent.js";

// The payload schema is strict, so app_version/device_model only survive
// because baseEventFields declares them. Native SDKs send both on every event;
// dropping the declaration turns each one into a 400 with no server-side
// symptom other than traffic quietly disappearing.

const UA = "MyApp/1.4.2 (cz.nkshub.myapp; Android 14; SM-G991B) RybbitFlutter/0.2.4";

const nativeBase = {
  site_id: "42",
  hostname: "cz.nkshub.myapp",
  pathname: "/home",
  screenWidth: 1080,
  screenHeight: 2400,
  language: "cs-CZ",
  page_title: "Home",
  user_id: "user-123",
  user_agent: UA,
  app_version: "1.4.2",
  device_model: "SM-G991B",
};

describe("native SDK payloads", () => {
  it.each([
    ["screen view", { type: "pageview" }],
    ["custom event", { type: "custom_event", event_name: "app_open", properties: '{"source":"cold"}' }],
    [
      "error with stack",
      {
        type: "error",
        event_name: "StateError",
        properties: '{"message":"Bad state: no element","stack":"#0 main (file:///app.dart:1:1)"}',
      },
    ],
  ])("keeps app_version and device_model on a %s", (_label, event) => {
    const result = trackingPayloadSchema.safeParse({ ...nativeBase, ...event });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({ app_version: "1.4.2", device_model: "SM-G991B" });
  });

  it("still accepts browser payloads that omit both fields", () => {
    const result = trackingPayloadSchema.safeParse({
      site_id: "42",
      type: "pageview",
      hostname: "example.com",
      pathname: "/",
      user_agent: "Mozilla/5.0",
    });

    expect(result.success).toBe(true);
  });

  it("rejects fields that were never declared", () => {
    const result = trackingPayloadSchema.safeParse({ ...nativeBase, type: "pageview", bogus_field: "x" });

    expect(result.success).toBe(false);
  });
});
