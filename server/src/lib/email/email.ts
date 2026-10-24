import { render } from "@react-email/components";
import { Resend } from "resend";
import type { SiteReport } from "../../services/weekyReports/weeklyReportTypes.js";
import { welcome } from "../../services/lifecycleEmails/lifecycleContent.js";
import { IS_CLOUD } from "../const.js";
import { signExpiringPayload } from "../signedToken.js";
import { letterText, type Letter } from "./letter.js";
import {
  ApproachingLimitEmail,
  approachingLimitSubject,
  type UsageEmailProps,
} from "./templates/ApproachingLimitEmail.js";
import { ChangeEmailEmail } from "./templates/ChangeEmailEmail.js";
import { InvitationEmail, inviterLabel } from "./templates/InvitationEmail.js";
import { LetterEmail } from "./templates/LetterEmail.js";
import { LimitExceededEmail } from "./templates/LimitExceededEmail.js";
import { OTP_COPY, OtpEmail, type OtpEmailType } from "./templates/OtpEmail.js";
import { SiteTransferEmail, type SiteTransferEmailProps } from "./templates/SiteTransferEmail.js";
import { VerifyEmailEmail } from "./templates/VerifyEmailEmail.js";
import { WeeklyReportEmail, weeklyReportSubject } from "./templates/WeeklyReportEmail.js";

let resend: Resend | undefined;
let marketingAudienceId: string | null = null;

if (IS_CLOUD) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

/**
 * The Resend SDK resolves failed requests (HTTP errors, rate limits, network failures) as
 * { data: null, error } instead of rejecting, so every call must check `error` itself.
 */
class ResendRequestError extends Error {
  constructor(
    action: string,
    readonly resendError: { name: string; message: string }
  ) {
    super(`Resend ${action} failed (${resendError.name}): ${resendError.message}`);
    this.name = "ResendRequestError";
  }
}

// Marketing audience management
export const getOrCreateMarketingAudience = async (): Promise<string> => {
  if (marketingAudienceId) return marketingAudienceId;
  if (!resend) throw new Error("Resend not initialized");

  // List existing audiences to check if "Marketing" exists. A failed list must not fall
  // through to creating (and caching) a second, empty "Marketing" audience.
  const { data: audiences, error: listError } = await resend.audiences.list();
  if (listError) throw new ResendRequestError("audience list", listError);
  const existing = audiences?.data?.find((a: { name: string }) => a.name === "Marketing");

  if (existing) {
    marketingAudienceId = existing.id;
    return existing.id;
  }

  // Create new audience
  const { data, error: createError } = await resend.audiences.create({ name: "Marketing" });
  if (createError || !data) {
    throw new ResendRequestError("audience create", createError ?? { name: "application_error", message: "no data" });
  }
  marketingAudienceId = data.id;
  return data.id;
};

export const addContactToAudience = async (email: string, firstName?: string): Promise<void> => {
  if (!resend) return;
  try {
    const audienceId = await getOrCreateMarketingAudience();
    const { error } = await resend.contacts.create({ audienceId, email, firstName, unsubscribed: false });
    if (error) throw new ResendRequestError("contact create", error);
  } catch (error) {
    console.error("Failed to add contact to audience:", error);
  }
};

/**
 * Whether marketing email to this address must be skipped: the contact unsubscribed, or was
 * never added to the audience. Throws when Resend can't answer (rate limit, outage), so the
 * caller skips this send and logs it instead of recording the contact as unsubscribed.
 */
export const isContactUnsubscribed = async (email: string): Promise<boolean> => {
  if (!resend) return false;
  const audienceId = await getOrCreateMarketingAudience();
  const { data: contact, error } = await resend.contacts.get({ audienceId, email });
  if (error) {
    if (error.name === "not_found") return true;
    throw new ResendRequestError("contact lookup", error);
  }
  // If contact doesn't exist or is unsubscribed, return true to skip sending
  if (!contact) return true;
  return contact.unsubscribed ?? false;
};

/**
 * Marks the contact unsubscribed. Throws if Resend rejects the update so the caller can
 * report the failure instead of confirming an unsubscribe that didn't happen. A contact
 * that isn't in the audience already receives no marketing email.
 */
export const unsubscribeContact = async (email: string): Promise<void> => {
  if (!resend) return;
  const audienceId = await getOrCreateMarketingAudience();
  const { error } = await resend.contacts.update({ audienceId, email, unsubscribed: true });
  if (error && error.name !== "not_found") {
    throw new ResendRequestError("contact unsubscribe", error);
  }
};

const TRANSACTIONAL_FROM = "Rybbit <automail@email.rybbit.com>";
const BILL_FROM = "Bill from Rybbit <bill@email.rybbit.com>";
// Replies to any email land in the monitored support inbox.
const REPLY_TO = "hello@rybbit.com";

interface SendOptions {
  text?: string;
  headers?: Record<string, string>;
}

/** Sends a transactional email. Throws when Resend does not accept it. */
export const sendEmail = async (email: string, subject: string, html: string, options: SendOptions = {}) => {
  if (!resend) {
    return;
    // not sure how to handle self hosted instances without resend
    // throw new Error("Resend is not initialized");
  }
  try {
    const response = await resend.emails.send({
      from: TRANSACTIONAL_FROM,
      replyTo: REPLY_TO,
      to: email,
      subject,
      html,
      ...(options.text ? { text: options.text } : {}),
      ...(options.headers ? { headers: options.headers } : {}),
    });
    if (response.error) {
      throw new ResendRequestError("email send", response.error);
    }
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const sendOtpEmail = async (email: string, otp: string, type: OtpEmailType) => {
  const html = await render(OtpEmail({ otp, type, email }));
  await sendEmail(email, OTP_COPY[type].subject, html);
};

export const sendEmailVerificationLink = async (email: string, verificationUrl: string) => {
  const html = await render(VerifyEmailEmail({ email, verificationUrl }));
  await sendEmail(email, "Verify your email for Rybbit", html);
};

export const sendChangeEmailVerification = async (currentEmail: string, newEmail: string, confirmUrl: string) => {
  const html = await render(ChangeEmailEmail({ currentEmail, newEmail, confirmUrl }));
  await sendEmail(currentEmail, "Confirm your new Rybbit email address", html);
};

export const sendInvitationEmail = async (props: {
  email: string;
  inviterName: string | null;
  inviterEmail: string;
  organizationName: string;
  role: string;
  expiresAt: Date;
  inviteLink: string;
}) => {
  const html = await render(InvitationEmail(props));
  const inviter = inviterLabel(props.inviterName, props.inviterEmail);
  await sendEmail(props.email, `${inviter} invited you to ${props.organizationName} on Rybbit`, html);
};

export const sendSiteTransferEmail = async (props: SiteTransferEmailProps) => {
  const html = await render(SiteTransferEmail(props));
  await sendEmail(props.email, `${props.sentBy} wants to transfer ${props.siteDomain} to you`, html);
};

export const sendLimitExceededEmail = async (email: string, usage: UsageEmailProps) => {
  const html = await render(LimitExceededEmail(usage));
  await sendEmail(email, `Tracking is paused for ${usage.organizationName}`, html);
};

export const sendApproachingLimitEmail = async (email: string, usage: UsageEmailProps) => {
  const html = await render(ApproachingLimitEmail(usage));
  await sendEmail(email, approachingLimitSubject(usage.organizationName, usage.eventCount, usage.eventLimit), html);
};

/**
 * Signed one-click link that turns off weekly reports for one user, used in the
 * report footer and its List-Unsubscribe header. Same 2-year TTL as the
 * marketing link: it has to keep working from old emails.
 */
export const weeklyReportUnsubscribeUrl = (userId: string): string => {
  const { exp, sig } = signExpiringPayload(`unsubscribe-reports:${userId}`, 2 * 365 * 24 * 3600);
  return `${process.env.BASE_URL}/api/user/unsubscribe-reports-oneclick?userId=${encodeURIComponent(userId)}&exp=${exp}&sig=${sig}`;
};

export const sendWeeklyReportEmail = async ({
  email,
  userId,
  site,
}: {
  email: string;
  userId: string;
  site: SiteReport;
}) => {
  const unsubscribeUrl = weeklyReportUnsubscribeUrl(userId);
  const html = await render(WeeklyReportEmail({ site, unsubscribeUrl }));
  await sendEmail(email, weeklyReportSubject(site), html, {
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
};

export const sendWelcomeEmail = async (email: string, name?: string) => {
  if (!resend) return;

  const letter = welcome(name);
  try {
    const { error } = await resend.emails.send({
      from: BILL_FROM,
      replyTo: REPLY_TO,
      to: email,
      subject: letter.subject,
      html: await render(LetterEmail({ letter })),
      text: letterText(letter),
    });
    if (error) throw new ResendRequestError("welcome email send", error);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
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
 * Lifecycle letter from Bill with a monitored reply address, sent as Ledger
 * HTML with the same content as plain text. All state-machine
 * onboarding/retention emails go through here.
 *
 * Returns true only when Resend actually accepted the message: the SDK
 * resolves with { data: null, error } on HTTP/network failures rather than
 * throwing, so the response is checked explicitly. The caller passes a
 * stable idempotencyKey (the lifecycle email key) so a retry after an
 * "accepted but response lost" failure can't double-send.
 */
export const sendLifecycleEmail = async (email: string, letter: Letter, idempotencyKey?: string): Promise<boolean> => {
  if (!resend) return false;

  const unsubscribeUrl = marketingUnsubscribeUrl(email);

  try {
    const html = await render(
      LetterEmail({ letter, footer: [{ label: "Unsubscribe from these emails", href: unsubscribeUrl }] })
    );
    const response = await resend.emails.send(
      {
        from: BILL_FROM,
        replyTo: REPLY_TO,
        to: email,
        subject: letter.subject,
        html,
        text: `${letterText(letter)}\n\n--\nUnsubscribe from these emails: ${unsubscribeUrl}`,
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
