import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above every top-level statement, so the factory cannot
// close over a plain `const`. vi.hoisted lifts the fixture with it.
const mockConst = vi.hoisted(() => ({
  DISABLE_SIGNUP: false,
  MAPBOX_TOKEN: "mapbox-token",
  LITE_DASHBOARD: false,
  GOOGLE_CLIENT_ID: undefined as string | undefined,
  GOOGLE_CLIENT_SECRET: undefined as string | undefined,
}));

vi.mock("../lib/const.js", () => mockConst);

// Distinctive values so the leak assertion cannot pass by coincidence.
const CLIENT_ID_SENTINEL = "google-client-id-sentinel";
const CLIENT_SECRET_SENTINEL = "google-client-secret-sentinel";

const { getConfig } = await import("./getConfig.js");

function makeReply() {
  const reply = {
    payload: undefined as unknown,
    send(body: unknown) {
      reply.payload = body;
      return reply;
    },
  };
  return reply;
}

async function callGetConfig() {
  const reply = makeReply();
  await getConfig({} as never, reply as never);
  return reply.payload as Record<string, unknown>;
}

describe("getConfig", () => {
  beforeEach(() => {
    mockConst.GOOGLE_CLIENT_ID = undefined;
    mockConst.GOOGLE_CLIENT_SECRET = undefined;
  });

  it("reports gscEnabled false when no Google OAuth credentials are set", async () => {
    expect(await callGetConfig()).toMatchObject({ gscEnabled: false });
  });

  it("reports gscEnabled false when only the client id is set", async () => {
    mockConst.GOOGLE_CLIENT_ID = CLIENT_ID_SENTINEL;
    expect(await callGetConfig()).toMatchObject({ gscEnabled: false });
  });

  it("reports gscEnabled false when only the client secret is set", async () => {
    mockConst.GOOGLE_CLIENT_SECRET = CLIENT_SECRET_SENTINEL;
    expect(await callGetConfig()).toMatchObject({ gscEnabled: false });
  });

  it("reports gscEnabled true when both credentials are set", async () => {
    mockConst.GOOGLE_CLIENT_ID = CLIENT_ID_SENTINEL;
    mockConst.GOOGLE_CLIENT_SECRET = CLIENT_SECRET_SENTINEL;
    expect(await callGetConfig()).toMatchObject({ gscEnabled: true });
  });

  it("never leaks the Google credentials themselves", async () => {
    mockConst.GOOGLE_CLIENT_ID = CLIENT_ID_SENTINEL;
    mockConst.GOOGLE_CLIENT_SECRET = CLIENT_SECRET_SENTINEL;
    const serialized = JSON.stringify(await callGetConfig());
    expect(serialized).not.toContain(CLIENT_ID_SENTINEL);
    expect(serialized).not.toContain(CLIENT_SECRET_SENTINEL);
  });

  it("still returns the pre-existing config fields", async () => {
    expect(await callGetConfig()).toMatchObject({
      disableSignup: false,
      mapboxToken: "mapbox-token",
      liteDashboard: false,
    });
  });
});
