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
