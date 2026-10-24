import * as React from "react";
import { appUrl } from "../format.js";
import { CodeBox, H1, HELP_URL, LedgerLayout, Note, P, Rows } from "./ledger.js";

export type OtpEmailType = "sign-in" | "email-verification" | "forget-password" | "change-email";

// Better Auth's email OTP default lifetime; auth.ts doesn't override it.
export const OTP_EXPIRES_MINUTES = 5;

interface OtpEmailProps {
  otp: string;
  type: OtpEmailType;
  email: string;
}

export const OTP_COPY: Record<OtpEmailType, { subject: string; heading: string; lead: string }> = {
  "sign-in": {
    subject: "Your Rybbit sign-in code",
    heading: "Sign in to Rybbit",
    lead: "Use this code to sign in.",
  },
  "email-verification": {
    subject: "Your Rybbit verification code",
    heading: "Verify your email",
    lead: "Use this code to verify your email address.",
  },
  "forget-password": {
    subject: "Your Rybbit password reset code",
    heading: "Reset your password",
    lead: "Use this code to set a new password.",
  },
  "change-email": {
    subject: "Your Rybbit email change code",
    heading: "Change your email",
    lead: "Use this code to confirm your new email address.",
  },
};

export const OtpEmail = ({ otp, type, email }: OtpEmailProps) => {
  const copy = OTP_COPY[type];
  return (
    <LedgerLayout
      preview={`Your code is ${otp}. It expires in ${OTP_EXPIRES_MINUTES} minutes.`}
      footer={[
        { label: "Help", href: HELP_URL },
        { label: "Account settings", href: `${appUrl()}/settings/account` },
      ]}
    >
      <H1>{copy.heading}</H1>
      <P>{copy.lead}</P>
      <CodeBox code={otp} />
      <Rows
        rows={[
          { label: "Account", value: email },
          { label: "Expires", value: `In ${OTP_EXPIRES_MINUTES} minutes`, strong: true },
        ]}
      />
      <Note>If you didn't request this, you can ignore this email.</Note>
    </LedgerLayout>
  );
};
