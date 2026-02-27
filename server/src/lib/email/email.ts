import { Resend } from "resend";
import { render } from "@react-email/components";
import { IS_CLOUD } from "../const.js";
import { InvitationEmail } from "./templates/InvitationEmail.js";
import { LimitExceededEmail } from "./templates/LimitExceededEmail.js";
import { OnboardingTipEmail } from "./templates/OnboardingTipEmail.js";
import { OtpEmail, type OtpEmailType } from "./templates/OtpEmail.js";
import { ReengagementEmail } from "./templates/ReengagementEmail.js";
import { WeeklyReportEmail } from "./templates/WeeklyReportEmail.js";
import type { OrganizationReport } from "../../services/weekyReports/weeklyReportTypes.js";
import type { OnboardingTipContent } from "../../services/onboardingTips/onboardingTipsContent.js";
import type { ReengagementContent } from "../../services/reengagement/reengagementContent.js";

let resend: Resend | undefined;
let marketingAudienceId: string | null = null;

if (IS_CLOUD) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Marketing audience management
export const getOrCreateMarketingAudience = async (): Promise<string> => {
  if (marketingAudienceId) return marketingAudienceId;
  if (!resend) throw new Error("Resend not initialized");

  // List existing audiences to check if "Marketing" exists
  const { data: audiences } = await resend.audiences.list();
  const existing = audiences?.data?.find((a: { name: string }) => a.name === "Marketing");

  if (existing) {
    marketingAudienceId = existing.id;
    return existing.id;
  }

  // Create new audience
  const { data } = await resend.audiences.create({ name: "Marketing" });
  marketingAudienceId = data!.id;
  return data!.id;
};

export const addContactToAudience = async (email: string, firstName?: string): Promise<void> => {
  if (!resend) return;
  try {
    const audienceId = await getOrCreateMarketingAudience();
    await resend.contacts.create({ audienceId, email, firstName, unsubscribed: false });
  } catch (error) {
    console.error("Failed to add contact to audience:", error);
  }
};

export const isContactUnsubscribed = async (email: string): Promise<boolean> => {
  if (!resend) return false;
  try {
    const audienceId = await getOrCreateMarketingAudience();
    const { data: contact } = await resend.contacts.get({ audienceId, email });
    // If contact doesn't exist or is unsubscribed, return true to skip sending
    if (!contact) return true;
    return contact.unsubscribed ?? false;
  } catch (error) {
    // If contact doesn't exist (404), don't send email
    return true;
  }
};

export const unsubscribeContact = async (email: string): Promise<void> => {
  if (!resend) return;
  try {
    const audienceId = await getOrCreateMarketingAudience();
    await resend.contacts.update({ audienceId, email, unsubscribed: true });
  } catch (error) {
    console.error("Failed to unsubscribe contact:", error);
  }
};

export const sendEmail = async (email: string, subject: string, html: string) => {
  if (!resend) {
    return;
    // not sure how to handle self hosted instances without resend
    // throw new Error("Resend is not initialized");
  }
  try {
    const response = await resend.emails.send({
      from: "Rybbit <automail@email.rybbit.com>",
      to: email,
      subject,
      html,
    });
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const OTP_SUBJECTS: Record<OtpEmailType, string> = {
  "sign-in": "Your Rybbit Sign-In Code",
  "email-verification": "Verify Your Email Address",
  "forget-password": "Reset Your Password",
};

export const sendOtpEmail = async (email: string, otp: string, type: OtpEmailType) => {
  const html = await render(OtpEmail({ otp, type }));
  await sendEmail(email, OTP_SUBJECTS[type], html);
};

export const sendInvitationEmail = async (
  email: string,
  invitedBy: string,
  organizationName: string,
  inviteLink: string
) => {
  const html = await render(
    InvitationEmail({
      email,
      invitedBy,
      organizationName,
      inviteLink,
    })
  );

  await sendEmail(email, "You're Invited to Join an Organization on Rybbit", html);
};

export const sendLimitExceededEmail = async (
  email: string,
  organizationName: string,
  eventCount: number,
  eventLimit: number
) => {
  const upgradeLink = "https://app.rybbit.io/settings/organization/subscription";

  const html = await render(
    LimitExceededEmail({
      organizationName,
      eventCount,
      eventLimit,
      upgradeLink,
    })
  );

  await sendEmail(email, `Action Required: ${organizationName} has exceeded its monthly event limit`, html);
};

export const sendWeeklyReportEmail = async (
  email: string,
  userName: string,
  organizationReport: OrganizationReport
) => {
  const html = await render(
    WeeklyReportEmail({
      userName,
      organizationReport,
    })
  );

  const subject = `Weekly Analytics Report - ${organizationReport.sites[0].siteName}`;

  await sendEmail(email, subject, html);
};

export const sendWelcomeEmail = async (email: string, name?: string) => {
  if (!resend) return;

  const greeting = name ? `Hi ${name}` : "Hi there";
  const text = `${greeting},

Welcome to Rybbit! Thanks for signing up.

I'm excited to have you on board. Rybbit is fully self-funded and we're fully committed to making an analytics platform that only serves the interests of our users.

If you run into any issues or have any questions or suggestions, just reply to this email - I'd love to hear from you.

Cheers,
Bill`;

  try {
    await resend.emails.send({
      from: "Bill from Rybbit <bill@email.rybbit.com>",
      replyTo: "hello@rybbit.com",
      to: email,
      subject: "Welcome to Rybbit!",
      text,
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
};

// Scheduled onboarding tip email - returns the email ID for cancellation
export const scheduleOnboardingTipEmail = async (
  email: string,
  userName: string,
  tipContent: OnboardingTipContent,
  scheduledAt: string
): Promise<string | null> => {
  if (!resend) return null;

  const unsubscribeUrl = `${process.env.BASE_URL}/api/user/unsubscribe-marketing-oneclick?email=${encodeURIComponent(email)}`;

  try {
    const html = await render(
      OnboardingTipEmail({
        userName,
        body: tipContent.body,
        linkText: tipContent.linkText,
        linkUrl: tipContent.linkUrl,
        unsubscribeUrl,
      })
    );

    const response = await resend.emails.send({
      from: "Rybbit <automail@email.rybbit.com>",
      to: email,
      subject: tipContent.subject,
      html,
      scheduledAt,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    return response.data?.id ?? null;
  } catch (error) {
    console.error("Failed to schedule onboarding tip email:", error);
    return null;
  }
};

// Cancel a scheduled email
export const cancelScheduledEmail = async (emailId: string): Promise<void> => {
  if (!resend) return;
  try {
    await resend.emails.cancel(emailId);
  } catch (error) {
    console.error("Failed to cancel scheduled email:", error);
  }
};

// Send re-engagement email
export const sendReengagementEmail = async (
  email: string,
  userName: string,
  content: ReengagementContent,
  siteId: number,
  domain: string
): Promise<void> => {
  if (!resend) return;

  const unsubscribeUrl = `${process.env.BASE_URL}/api/user/unsubscribe-marketing-oneclick?email=${encodeURIComponent(email)}`;

  try {
    const html = await render(
      ReengagementEmail({
        userName,
        day: content.day,
        title: content.title,
        message: content.message,
        ctaText: content.ctaText,
        siteId,
        domain,
        unsubscribeUrl,
      })
    );

    await resend.emails.send({
      from: "Rybbit <automail@email.rybbit.com>",
      to: email,
      subject: content.subject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (error) {
    console.error("Failed to send re-engagement email:", error);
  }
};
