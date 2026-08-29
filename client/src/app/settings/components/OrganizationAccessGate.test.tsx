import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationAccessGate } from "./OrganizationAccessGate";

const messages = {
  deniedMessage: "Access denied",
  errorMessage: "Could not check access",
  loadingMessage: "Checking access",
  noOrganizationMessage: "Select an Organization",
  onRetry: vi.fn(),
  retryLabel: "Try again",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OrganizationAccessGate", () => {
  it.each(["membership-pending", "membership-missing"] as const)(
    "does not mount protected children when access is %s",
    reason => {
      render(
        <OrganizationAccessGate {...messages} decision={{ allowed: false, reason }}>
          <div>Protected settings</div>
        </OrganizationAccessGate>
      );

      expect(screen.queryByText("Protected settings")).toBeNull();
    }
  );

  it("mounts protected children only after access is allowed", () => {
    render(
      <OrganizationAccessGate {...messages} decision={{ allowed: true }}>
        <div>Protected settings</div>
      </OrganizationAccessGate>
    );

    expect(screen.getByText("Protected settings")).toBeTruthy();
  });

  it("distinguishes an access-query failure from a permission denial", () => {
    const onRetry = vi.fn();
    render(
      <OrganizationAccessGate {...messages} decision={{ allowed: false, reason: "membership-error" }} onRetry={onRetry}>
        <div>Protected settings</div>
      </OrganizationAccessGate>
    );

    expect(screen.getByText("Could not check access")).toBeTruthy();
    expect(screen.queryByText("Access denied")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
