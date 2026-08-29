import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_TIPS } from "./onboardingTipsContent.js";

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../../lib/email/email.js", () => ({
  scheduleOnboardingTipEmail: mocks.schedule,
  cancelScheduledEmail: mocks.cancel,
}));

import { onboardingTipsService } from "./onboardingTipsService.js";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-29T15:45:30.123Z"));
  mocks.schedule.mockReset();
  mocks.cancel.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("onboardingTipsService.scheduleOnboardingEmails", () => {
  it("schedules every configured tip for 9am UTC on its signup-relative day", async () => {
    mocks.schedule.mockImplementation(async (_email, _name, tip) => `email-day-${tip.day}`);

    await expect(onboardingTipsService.scheduleOnboardingEmails("person@example.com", "Ada")).resolves.toEqual(
      ONBOARDING_TIPS.map(tip => `email-day-${tip.day}`)
    );

    expect(mocks.schedule).toHaveBeenCalledTimes(ONBOARDING_TIPS.length);
    const expectedSchedule = [
      "2026-08-30T09:00:00.000Z",
      "2026-08-31T09:00:00.000Z",
      "2026-09-01T09:00:00.000Z",
      "2026-09-02T09:00:00.000Z",
      "2026-09-03T09:00:00.000Z",
    ];
    for (const [index, tip] of ONBOARDING_TIPS.entries()) {
      expect(mocks.schedule).toHaveBeenNthCalledWith(
        index + 1,
        "person@example.com",
        "Ada",
        tip,
        expectedSchedule[index]
      );
    }
  });

  it("passes an empty display name and omits provider calls that return no id", async () => {
    mocks.schedule
      .mockResolvedValueOnce("email-1")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("email-3")
      .mockResolvedValue(null);

    await expect(onboardingTipsService.scheduleOnboardingEmails("person@example.com")).resolves.toEqual([
      "email-1",
      "email-3",
    ]);
    expect(mocks.schedule.mock.calls.every(call => call[1] === "")).toBe(true);
    expect(mocks.schedule).toHaveBeenCalledTimes(ONBOARDING_TIPS.length);
  });

  it("propagates a scheduling failure and does not schedule later tips", async () => {
    const providerError = new Error("provider unavailable");
    mocks.schedule.mockResolvedValueOnce("email-1").mockRejectedValueOnce(providerError);

    await expect(onboardingTipsService.scheduleOnboardingEmails("person@example.com", "Ada")).rejects.toBe(
      providerError
    );
    expect(mocks.schedule).toHaveBeenCalledTimes(2);
  });

  it("keeps results isolated across overlapping scheduling requests", async () => {
    mocks.schedule.mockImplementation(async (email, _name, tip) => `${email}:day-${tip.day}`);

    const [adaIds, graceIds] = await Promise.all([
      onboardingTipsService.scheduleOnboardingEmails("ada@example.com", "Ada"),
      onboardingTipsService.scheduleOnboardingEmails("grace@example.com", "Grace"),
    ]);

    expect(adaIds).toEqual(ONBOARDING_TIPS.map(tip => `ada@example.com:day-${tip.day}`));
    expect(graceIds).toEqual(ONBOARDING_TIPS.map(tip => `grace@example.com:day-${tip.day}`));
  });
});

describe("onboardingTipsService.cancelScheduledEmails", () => {
  it("cancels each provider id in order", async () => {
    mocks.cancel.mockResolvedValue(undefined);

    await expect(
      onboardingTipsService.cancelScheduledEmails(["email-1", "email-2", "email-3"])
    ).resolves.toBeUndefined();

    expect(mocks.cancel.mock.calls).toEqual([["email-1"], ["email-2"], ["email-3"]]);
  });

  it("does nothing for an empty id list", async () => {
    await expect(onboardingTipsService.cancelScheduledEmails([])).resolves.toBeUndefined();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it("stops after the first cancellation failure", async () => {
    const providerError = new Error("cancellation failed");
    mocks.cancel.mockResolvedValueOnce(undefined).mockRejectedValueOnce(providerError);

    await expect(onboardingTipsService.cancelScheduledEmails(["email-1", "email-2", "email-3"])).rejects.toBe(
      providerError
    );
    expect(mocks.cancel.mock.calls).toEqual([["email-1"], ["email-2"]]);
  });
});
