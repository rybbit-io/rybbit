import { Resend } from "resend";
import { render } from "@react-email/components";
import { IS_CLOUD } from "../const.js";
import { InvitationEmail } from "./templates/InvitationEmail.js";
import { LimitExceededEmail } from "./templates/LimitExceededEmail.js";
import { WeeklyReportEmail } from "./templates/WeeklyReportEmail.js";
import type { OrganizationReport } from "../../services/weekyReports/weeklyReportTypes.js";

let resend: Resend | undefined;

if (IS_CLOUD) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export const sendEmail = async (email: string, subject: string, html: string) => {
  if (!resend) {
    return;
    // not sure how to handle self hosted instances without resend
    // throw new Error("Resend is not initialized");
  }
  try {
    const response = await resend.emails.send({
      from: "Rybbit <automail@rybbit.com>",
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
      from: "Bill from Rybbit <bill@rybbit.com>",
      replyTo: "hello@rybbit.com",
      to: email,
      subject: "Welcome to Rybbit!",
      text,
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
};
