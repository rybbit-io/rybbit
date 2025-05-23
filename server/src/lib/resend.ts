import { Resend } from "resend";
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from "./const.js";

let resend: Resend | undefined;

if (RESEND_API_KEY !== false) {
  resend = new Resend(RESEND_API_KEY);
}

export const sendEmail = async (
  email: string,
  subject: string,
  html: string
) => {
  if (!resend) {
    return;
    // not sure how to handle self hosted instances without resend
    // throw new Error("Resend is not initialized");
  }
  try {
    const response = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
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
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to Join Rybbit</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #0c0c0c;
            margin: 0;
            padding: 0;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 24px;
            background-color: #0c0c0c;
          }
          .header {
            text-align: center;
            padding-bottom: 32px;
          }
          .logo {
            margin: 0 auto;
            display: block;
          }
          .content {
            padding: 0;
          }
          .invite-badge {
            display: inline-block;
            background-color: rgba(16, 185, 129, 0.2);
            color: #10b981;
            padding: 6px 12px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 16px;
            text-align: center;
          }
          .invite-text {
            font-size: 16px;
            margin-bottom: 32px;
            color: #e5e5e5;
          }
          .highlight {
            font-weight: bold;
            color: #10b981;
          }
          .button-container {
            text-align: center;
            margin: 32px 0;
          }
          .button {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 12px 32px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 6px;
            font-size: 16px;
            transition: background-color 0.3s;
          }
          .button:hover {
            background-color: #059669;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #27272a;
            font-size: 12px;
            color: #a3a3a3;
          }
          .footer a {
            color: #10b981;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          h2 {
            color: #ffffff;
            font-size: 28px;
            text-align: center;
            margin-bottom: 24px;
            font-weight: 600;
          }
          p {
            margin: 12px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="content">
            <div style="text-align: center;">
              <div class="invite-badge">New Invitation</div>
              <h2>You've Been Invited!</h2>
            </div>
            <div class="invite-text">
              <p>${invitedBy} has invited you to join <span class="highlight">${organizationName}</span> on Rybbit Analytics.</p>
              <p>Rybbit is an open-source analytics platform that helps you understand your website traffic while respecting user privacy.</p>
            </div>
            <div class="button-container">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
          </div>
          <div class="footer">
            <p>This invitation was sent to <span class="highlight">${email}</span>.</p>
            <p>&copy; ${new Date().getFullYear()} Rybbit Analytics</p>
          </div>
        </div>
      </body>
    </html>
  `;
  await sendEmail(
    email,
    "You're Invited to Join an Organization on Rybbit",
    html
  );
};
