import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FeatureFlag } from "@/api/analytics/endpoints";

import { FeatureFlagDialog } from "./FeatureFlagDialog";

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string | number>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`)) : message,
}));

vi.mock("@/api/analytics/hooks/featureFlags/useFeatureFlags", () => ({
  useCreateFeatureFlag: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateFeatureFlag: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("./ConditionSetsEditor", () => ({ ConditionSetsEditor: () => null }));
vi.mock("@/components/CodeSnippet", () => ({ CodeSnippet: () => null }));
vi.mock("@/components/ui/sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const flag: FeatureFlag = {
  flagId: 42,
  siteId: 1,
  key: "new-checkout",
  description: "Original",
  enabled: true,
  runtime: "client",
  flagType: "boolean",
  payload: null,
  variants: [],
  rolloutPercentage: 50,
  rules: [],
  conditionSets: [{ rules: [], rolloutPercentage: 50 }],
  version: 3,
  createdAt: "2026-09-01 10:00:00",
  updatedAt: "2026-09-20 10:00:00",
  stats: [],
};

const description = () => screen.getByLabelText("Description") as HTMLTextAreaElement;

afterEach(() => {
  cleanup();
});

describe("FeatureFlagDialog", () => {
  it("keeps unsaved edits when the list refetches the same flag", () => {
    const { rerender } = render(<FeatureFlagDialog flag={flag} open onOpenChange={() => {}} />);
    fireEvent.change(description(), { target: { value: "Edited" } });

    // A focus refetch hands back a new object for the same flag, with fresh stats.
    rerender(<FeatureFlagDialog flag={{ ...flag, stats: [] }} open onOpenChange={() => {}} />);

    expect(description().value).toBe("Edited");
  });

  it("loads another flag, and reloads on reopen", () => {
    const { rerender } = render(<FeatureFlagDialog flag={flag} open onOpenChange={() => {}} />);
    fireEvent.change(description(), { target: { value: "Edited" } });

    rerender(<FeatureFlagDialog flag={{ ...flag, flagId: 43, description: "Other" }} open onOpenChange={() => {}} />);
    expect(description().value).toBe("Other");

    fireEvent.change(description(), { target: { value: "Edited again" } });
    rerender(<FeatureFlagDialog flag={{ ...flag, flagId: 43, description: "Other" }} open={false} />);
    rerender(<FeatureFlagDialog flag={{ ...flag, flagId: 43, description: "Other" }} open onOpenChange={() => {}} />);
    expect(description().value).toBe("Other");
  });
});
