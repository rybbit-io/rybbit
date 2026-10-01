import { describe, expect, it } from "vitest";
import { UsersListResponse, UsersResponse } from "../../../../../api/analytics/endpoints";
import { CachedUsersList, findUsersListPosition } from "./usersListPosition";

const row = (userId: string, identifiedUserId = "") =>
  ({ user_id: userId, identified_user_id: identifiedUserId }) as UsersResponse;

const list = (
  rows: UsersResponse[],
  params: Record<string, unknown>,
  updatedAt: number,
  totalCount = 4870
): CachedUsersList => ({
  data: {
    data: rows,
    totalCount,
    page: Number(params.page ?? 1),
    pageSize: Number(params.page_size ?? 50),
  } as UsersListResponse,
  params,
  updatedAt,
});

describe("findUsersListPosition", () => {
  const firstPage = list([row("fp1", "mara"), row("fp2"), row("fp3", "elias")], { page: 1, page_size: 50 }, 100);

  it("finds an identified user by the id the list links them with", () => {
    expect(findUsersListPosition([firstPage], ["mara"])).toEqual({
      list: firstPage,
      position: 1,
      total: 4870,
      identifiedOnly: false,
      previousId: null,
      nextId: "fp2",
    });
  });

  it("finds an anonymous visitor by fingerprint and names both neighbours", () => {
    expect(findUsersListPosition([firstPage], ["fp2"])).toMatchObject({
      position: 2,
      previousId: "mara",
      nextId: "elias",
    });
  });

  it("matches a profile opened by fingerprint after the device was identified", () => {
    // The route still carries the fingerprint; the resolved identity is tried too.
    expect(findUsersListPosition([firstPage], ["fp3", "elias"])?.position).toBe(3);
  });

  it("counts from the start of the list on a later page and stops at the page's edges", () => {
    const thirdPage = list([row("a"), row("b")], { page: 3, page_size: 50, identified_only: true }, 100);

    expect(findUsersListPosition([thirdPage], ["b"])).toEqual({
      list: thirdPage,
      position: 102,
      total: 4870,
      identifiedOnly: true,
      previousId: "a",
      nextId: null,
    });
  });

  it("prefers the list fetched most recently", () => {
    const older = list([row("x"), row("fp2")], { page: 1, page_size: 50 }, 50);

    expect(findUsersListPosition([older, firstPage], ["fp2"])?.previousId).toBe("mara");
    expect(findUsersListPosition([firstPage, older], ["fp2"])?.previousId).toBe("mara");
  });

  it("does not mistake an identified user for the anonymous visitor behind the same fingerprint", () => {
    const shared = list([row("fp9", "bob"), row("fp9")], { page: 1, page_size: 50 }, 100);

    expect(findUsersListPosition([shared], ["fp9"])?.position).toBe(2);
  });

  it("has no position for a profile that is in no fetched list", () => {
    expect(findUsersListPosition([firstPage], ["stranger"])).toBeNull();
    expect(findUsersListPosition([], ["mara"])).toBeNull();
    expect(findUsersListPosition([{ data: undefined, params: undefined, updatedAt: 1 }], ["mara"])).toBeNull();
    expect(findUsersListPosition([firstPage], [""])).toBeNull();
  });
});
