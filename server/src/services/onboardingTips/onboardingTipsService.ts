import { DateTime } from "luxon";
import { scheduleOnboardingTipEmail, cancelScheduledEmail } from "../../lib/email/email.js";
import { ONBOARDING_TIPS } from "./onboardingTipsContent.js";

class OnboardingTipsService {
  /**
   * Schedule all 7 onboarding tip emails at signup
   * Returns array of Resend email IDs for cancellation
   */
  async scheduleOnboardingEmails(email: string, name?: string): Promise<string[]> {
    const emailIds: string[] = [];
    const now = DateTime.utc();

    for (const tip of ONBOARDING_TIPS) {
      // Schedule email for day N at 9am UTC
      const scheduledAt = now.plus({ days: tip.day }).set({ hour: 9, minute: 0, second: 0 }).toISO();

      if (!scheduledAt) continue;

      const emailId = await scheduleOnboardingTipEmail(email, name || "", tip, scheduledAt);

      if (emailId) {
        emailIds.push(emailId);
      }
    }

    return emailIds;
  }

  /**
   * Cancel all scheduled tip emails for a user
   */
  async cancelScheduledEmails(emailIds: string[]): Promise<void> {
    for (const emailId of emailIds) {
      await cancelScheduledEmail(emailId);
    }
  }
}

export const onboardingTipsService = new OnboardingTipsService();
