import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ cloud: true, memberLimit: null as number | null, members: 0 }));

vi.mock("./const.js", () => ({
  get IS_CLOUD() {
    return state.cloud;
  },
}));
vi.mock("../api/stripe/getSubscription.js", () => ({
  getSubscriptionInner: vi.fn(async () => ({ memberLimit: state.memberLimit })),
}));
vi.mock("../db/postgres/postgres.js", () => ({
  db: { select: () => ({ from: () => ({ where: async () => [{ value: state.members }] }) }) },
}));

import { getMemberLimitError } from "./memberLimits.js";

beforeEach(() => {
  state.cloud = true;
  state.memberLimit = null;
  state.members = 0;
});

describe("getMemberLimitError", () => {
  it("admits members while the organization is under its plan's limit", async () => {
    state.memberLimit = 3;
    state.members = 2;
    expect(await getMemberLimitError("org_1")).toBeNull();
  });

  it("refuses once the organization is full", async () => {
    state.memberLimit = 3;
    state.members = 3;
    expect(await getMemberLimitError("org_1")).toBe(
      "You have reached the limit of 3 members for your plan. Please upgrade to add more."
    );
  });

  it("never limits unlimited plans or self-hosted instances", async () => {
    state.members = 500;
    expect(await getMemberLimitError("org_1")).toBeNull();

    state.memberLimit = 1;
    state.cloud = false;
    expect(await getMemberLimitError("org_1")).toBeNull();
  });
});
