import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrgMembership: vi.fn(),
  getIsUserAdmin: vi.fn(),
  findUser: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: { query: { user: { findFirst: mocks.findUser } } },
}));
vi.mock("../../db/postgres/schema.js", () => ({ member: {}, user: {} }));
vi.mock("../../lib/access.js", () => ({ getOrgMembership: mocks.getOrgMembership }));
vi.mock("../../lib/auth-utils.js", () => ({ getIsUserAdmin: mocks.getIsUserAdmin }));
vi.mock("../../lib/memberLimits.js", () => ({ getPlanMemberLimit: vi.fn(), memberLimitError: vi.fn() }));
vi.mock("../../services/sites/withOrganizationSiteLock.js", () => ({ withOrganizationSiteLock: vi.fn() }));

import { addUserToOrganization } from "./addUserToOrganization.js";

function reply() {
  const res = { statusCode: 200, body: undefined as unknown, status: vi.fn(), send: vi.fn() };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.send.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

function request(role: string, bearer: { bearerAuth?: boolean; bearerSessionEquivalent?: boolean }) {
  return {
    params: { organizationId: "org_1" },
    body: { email: "new@example.com", role },
    user: { id: "caller" },
    log: { error: vi.fn() },
    ...bearer,
  } as never;
}

const scopedKey = { bearerAuth: true, bearerSessionEquivalent: false };

describe("addUserToOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIsUserAdmin.mockResolvedValue(false);
    mocks.getOrgMembership.mockResolvedValue({ role: "owner" });
    // Stop at the user lookup: reaching it means the role checks passed.
    mocks.findUser.mockResolvedValue(undefined);
  });

  // A scoped key or OAuth token is refused key minting, billing and the DPA.
  // Making an account admin or owner would hand it all three anyway.
  it.each(["admin", "owner"])("refuses to let a restricted credential grant %s", async role => {
    const res = reply();

    await addUserToOrganization(request(role, scopedKey), res as never);

    expect(res.statusCode).toBe(403);
    expect(mocks.findUser).not.toHaveBeenCalled();
  });

  it.each(["editor", "member", "viewer"])("lets a restricted credential grant %s", async role => {
    const res = reply();

    await addUserToOrganization(request(role, scopedKey), res as never);

    expect(mocks.findUser).toHaveBeenCalled();
  });

  it.each([
    ["a session", {}],
    ["an unrestricted personal key", { bearerAuth: true, bearerSessionEquivalent: true }],
  ])("lets %s grant owner", async (_label, bearer) => {
    const res = reply();

    await addUserToOrganization(request("owner", bearer), res as never);

    expect(mocks.findUser).toHaveBeenCalled();
  });
});
