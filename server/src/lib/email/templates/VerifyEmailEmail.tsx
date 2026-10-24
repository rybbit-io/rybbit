import * as React from "react";
import { H1, HELP_URL, LedgerLayout, Note, P, PrimaryButton, Rows, UrlFallback } from "./ledger.js";

interface VerifyEmailEmailProps {
  email: string;
  verificationUrl: string;
}

/**
 * Confirms an address: a new account's, or the new address at the end of an
 * email change. Better Auth's verification token lasts an hour by default.
 */
export const VerifyEmailEmail = ({ email, verificationUrl }: VerifyEmailEmailProps) => (
  <LedgerLayout
    preview={`Confirm ${email} to continue. The link expires in 1 hour.`}
    footer={[{ label: "Help", href: HELP_URL }]}
  >
    <H1>Verify your email</H1>
    <P>Click the button to confirm {email} is your email address.</P>
    <PrimaryButton top={24} label="Verify email" href={verificationUrl} />
    <Rows
      rows={[
        { label: "Email", value: email },
        { label: "Link expires", value: "In 1 hour", strong: true },
      ]}
    />
    <UrlFallback url={verificationUrl} />
    <Note>If you didn't request this, you can ignore this email.</Note>
  </LedgerLayout>
);
