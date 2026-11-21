import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRemoveUserFromOrganization } from "./useOrganizations";

const mocks = vi.hoisted(() => ({ removeMember: vi.fn() }));

vi.mock("../../../lib/auth", () => ({
  authClient: { organization: { removeMember: mocks.removeMember } },
}));

function renderRemoveMember() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRemoveUserFromOrganization(), { wrapper });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useRemoveUserFromOrganization", () => {
  it("fails when Better Auth resolves with an error instead of throwing", async () => {
    mocks.removeMember.mockResolvedValue({ data: null, error: { status: 403, message: "Not allowed" } });
    const onSuccess = vi.fn();
    const { result } = renderRemoveMember();

    await act(async () => {
      await expect(
        result.current.mutateAsync({ memberIdOrEmail: "m1", organizationId: "org1" }, { onSuccess })
      ).rejects.toThrow("Not allowed");
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("succeeds when the member was removed", async () => {
    mocks.removeMember.mockResolvedValue({ data: { member: { id: "m1" } }, error: null });
    const { result } = renderRemoveMember();

    await act(async () => {
      await result.current.mutateAsync({ memberIdOrEmail: "m1", organizationId: "org1" });
    });

    expect(mocks.removeMember).toHaveBeenCalledWith({ memberIdOrEmail: "m1", organizationId: "org1" });
  });
});
