import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { info } = vi.hoisted(() => ({ info: vi.fn() }));
vi.mock("../../../lib/logger/logger.js", () => ({ logger: { info } }));

const diagnostic = {
  siteId: 123,
  blockBots: true,
  score: 3,
  strongScore: 0,
  signalMask: 540,
  signals: ["missingChrome", "swiftShader", "emptyPlugins", "pluginApiAbsence"] as const,
  hasClientScore: true,
  hasClientMask: true,
  asn: 203061,
};

async function recorder() {
  return (await import("./acceptedRequestDiagnostics.js")).recordAcceptedRequestDiagnostic;
}

describe("accepted request diagnostics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "");
    vi.spyOn(performance, "now").mockReturnValue(0);
    info.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is off by default", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", undefined);
    (await recorder())(diagnostic);
    expect(info).not.toHaveBeenCalled();
  });

  it("only samples the configured numeric site IDs", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", " 123, 456,123 ");
    const record = await recorder();
    record({ ...diagnostic, siteId: 789 });
    record(diagnostic);
    record({ ...diagnostic, siteId: 456 });

    expect(info.mock.calls.map(([entry]) => entry.siteId)).toEqual([123, 456]);
  });

  it.each([
    "*",
    "123,invalid",
    ",123",
    "123,",
    "123,,456",
    "0,123",
    "-1,123",
    "1.5,123",
    "1e2,123",
    "9007199254740992,123",
  ])("disables diagnostics for an invalid allowlist: %s", async value => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", value);
    (await recorder())(diagnostic);
    expect(info).not.toHaveBeenCalled();
  });

  it("bounds the configured sites and rate-limit map", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", Array.from({ length: 101 }, (_, index) => String(index + 1)).join(","));
    (await recorder())({ ...diagnostic, siteId: 1 });
    expect(info).not.toHaveBeenCalled();
  });

  it("reads operator configuration once at startup", async () => {
    const record = await recorder();
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "123");
    record(diagnostic);
    expect(info).not.toHaveBeenCalled();
  });

  it("projects only diagnostic fields, without request or visitor data", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "123");
    const input = {
      ...diagnostic,
      ipAddress: "203.0.113.10",
      userAgent: "private browser fingerprint",
      hostname: "private.example",
      pathname: "/private-route",
      headers: { authorization: "secret", cookie: "private cookie" },
      payload: { email: "private@example.com" },
      sessionId: "private session",
      userId: "private identity",
    };
    (await recorder())(input);

    expect(info).toHaveBeenCalledWith(
      {
        event: "bot_detection_accepted_diagnostic",
        siteId: 123,
        decision: "not_classified_as_bot",
        reason: "supporting_signals_only",
        blockBots: true,
        score: 3,
        strongScore: 0,
        signalMask: 540,
        signals: diagnostic.signals,
        hasClientScore: true,
        hasClientMask: true,
        asn: 203061,
        asnSource: "unclassified",
      },
      "Bot detection accepted request with supporting client signals"
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("private");
    expect(JSON.stringify(info.mock.calls)).not.toContain("secret");
  });

  it("distinguishes a missing mask and ASN from reported values", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "123");
    (await recorder())({ ...diagnostic, hasClientMask: false, asn: undefined });
    expect(info.mock.calls[0][0]).toMatchObject({ hasClientMask: false, asn: null, asnSource: "unclassified" });
  });

  it("records an existing hosting classification without changing it", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "123");
    (await recorder())({ ...diagnostic, asn: 16509, asnSource: "ipverse_hosting" });
    expect(info.mock.calls[0][0]).toMatchObject({ asn: 16509, asnSource: "ipverse_hosting" });
  });

  it("samples at most once per minute per configured site and process", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "123,456");
    const record = await recorder();
    record(diagnostic);
    record(diagnostic);
    vi.mocked(performance.now).mockReturnValue(59_999);
    record(diagnostic);
    record({ ...diagnostic, siteId: 456 });
    expect(info.mock.calls.map(([entry]) => entry.siteId)).toEqual([123, 456]);

    vi.mocked(performance.now).mockReturnValue(60_000);
    record(diagnostic);
    expect(info).toHaveBeenCalledTimes(3);
  });

  it("does not depend on the wall clock for rate limiting", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "123");
    const record = await recorder();
    record(diagnostic);
    vi.spyOn(Date, "now").mockReturnValue(9_999_999_999_999);
    record(diagnostic);
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("keeps logger failures out of ingestion and still rate-limits attempts", async () => {
    vi.stubEnv("BOT_DIAGNOSTIC_SITE_IDS", "123");
    info.mockImplementation(() => {
      throw new Error("log sink failed");
    });
    const record = await recorder();
    expect(() => record(diagnostic)).not.toThrow();
    record(diagnostic);
    expect(info).toHaveBeenCalledTimes(1);
  });
});
