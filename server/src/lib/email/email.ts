import { Resend } from "resend";
import { render } from "@react-email/components";
import { IS_CLOUD } from "../const.js";
import { ApproachingLimitEmail } from "./templates/ApproachingLimitEmail.js";
import { InvitationEmail } from "./templates/InvitationEmail.js";
import { LimitExceededEmail } from "./templates/LimitExceededEmail.js";
import { OtpEmail, type OtpEmailType } from "./templates/OtpEmail.js";
import { WeeklyReportEmail } from "./templates/WeeklyReportEmail.js";
import type { SiteReport } from "../../services/weekyReports/weeklyReportTypes.js";
import { signExpiringPayload } from "../signedToken.js";

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
  "change-email": "Change Your Email Address",
};

export const sendOtpEmail = async (email: string, otp: string, type: OtpEmailType) => {
  const html = await render(OtpEmail({ otp, type }));
  await sendEmail(email, OTP_SUBJECTS[type], html);
};

export const sendEmailVerificationLink = async (email: string, verificationUrl: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 16px;">Verify your email</h2>
      <p>Click the button below to verify this email address on your Rybbit account.</p>
      <p style="margin: 24px 0;">
        <a href="${verificationUrl}" style="background: #111; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Verify email</a>
      </p>
      <p style="font-size: 12px; color: #666; word-break: break-all;">Or paste this link into your browser: ${verificationUrl}</p>
    </div>
  `;

  await sendEmail(email, "Verify your Rybbit email", html);
};

export const sendChangeEmailVerification = async (
  currentEmail: string,
  newEmail: string,
  verificationUrl: string
) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 16px;">Confirm your new email</h2>
      <p>We received a request to change the email on your Rybbit account from <strong>${currentEmail}</strong> to <strong>${newEmail}</strong>.</p>
      <p>Click the button below to confirm the change. If you didn't request this, you can safely ignore this email.</p>
      <p style="margin: 24px 0;">
        <a href="${verificationUrl}" style="background: #111; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Confirm email change</a>
      </p>
      <p style="font-size: 12px; color: #666; word-break: break-all;">Or paste this link into your browser: ${verificationUrl}</p>
    </div>
  `;

  await sendEmail(currentEmail, "Confirm your email change on Rybbit", html);
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
  const upgradeLink = "https://app.rybbit.io/settings/subscription";

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

export const sendApproachingLimitEmail = async (
  email: string,
  organizationName: string,
  eventCount: number,
  eventLimit: number
) => {
  const upgradeLink = "https://app.rybbit.io/settings/subscription";

  const html = await render(
    ApproachingLimitEmail({
      organizationName,
      eventCount,
      eventLimit,
      upgradeLink,
    })
  );

  await sendEmail(email, `${organizationName} is approaching its monthly event limit`, html);
};

export const sendWeeklyReportEmail = async (
  email: string,
  userName: string,
  organizationName: string,
  site: SiteReport
) => {
  const html = await render(
    WeeklyReportEmail({
      userName,
      organizationName,
      site,
    })
  );

  const subject = `Weekly Analytics Report - ${site.siteName}`;

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

// Cancel a scheduled email
export const cancelScheduledEmail = async (emailId: string): Promise<void> => {
  if (!resend) return;
  try {
    await resend.emails.cancel(emailId);
  } catch (error) {
    console.error("Failed to cancel scheduled email:", error);
  }
};

/**
 * Signed one-click marketing unsubscribe URL used by all lifecycle emails.
 * Unsubscribe links must keep working from old emails, so the TTL is long
 * (2 years) - the expiry exists so a leaked link is not valid forever.
 */
export const marketingUnsubscribeUrl = (email: string): string => {
  const { exp, sig } = signExpiringPayload(`unsubscribe:${email}`, 2 * 365 * 24 * 3600);
  return `${process.env.BASE_URL}/api/user/unsubscribe-marketing-oneclick?email=${encodeURIComponent(email)}&exp=${exp}&sig=${sig}`;
};

/**
 * Plain-text lifecycle email from Bill with a monitored reply address.
 * All state-machine onboarding/retention emails go through here.
 *
 * Returns true only when Resend actually accepted the message: the SDK
 * resolves with { data: null, error } on HTTP/network failures rather than
 * throwing, so the response is checked explicitly. The caller passes a
 * stable idempotencyKey (the lifecycle email key) so a retry after an
 * "accepted but response lost" failure can't double-send.
 */
export const sendLifecycleEmail = async (
  email: string,
  subject: string,
  text: string,
  idempotencyKey?: string
): Promise<boolean> => {
  if (!resend) return false;

  const unsubscribeUrl = marketingUnsubscribeUrl(email);

  try {
    const response = await resend.emails.send(
      {
        from: "Bill from Rybbit <bill@email.rybbit.com>",
        replyTo: "hello@rybbit.com",
        to: email,
        subject,
        text: `${text}\n\n--\nUnsubscribe from these emails: ${unsubscribeUrl}`,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );
    if (response.error || !response.data?.id) {
      console.error("Resend rejected lifecycle email:", response.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send lifecycle email:", error);
    return false;
  }
};
