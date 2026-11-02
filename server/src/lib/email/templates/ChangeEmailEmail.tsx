import * as React from "react";
import { appUrl } from "../format.js";
import { H1, HELP_URL, LedgerLayout, Note, P, PrimaryButton, Rows, TextLink, UrlFallback } from "./ledger.js";

interface ChangeEmailEmailProps {
  currentEmail: string;
  newEmail: string;
  confirmUrl: string;
}

/**
 * Sent to the current address. Confirming makes Better Auth send a
 * verification link to the new address, which completes the change.
 */
export const ChangeEmailEmail = ({ currentEmail, newEmail, confirmUrl }: ChangeEmailEmailProps) => (
  <LedgerLayout
    preview={`Confirm the switch from ${currentEmail} to ${newEmail}.`}
    footer={[
      { label: "Help", href: HELP_URL },
      { label: "Account settings", href: `${appUrl()}/settings/account` },
    ]}
  >
    <H1>Confirm your new email address</H1>
    <P>We got a request to change the email on your Rybbit account.</P>
    <Rows
      top={24}
      rows={[
        { label: "Current", value: currentEmail },
        { label: "New", value: newEmail, strong: true },
      ]}
    />
    <PrimaryButton label="Confirm the change" href={confirmUrl} />
    <P top={24}>Once you confirm, we'll send a verification link to {newEmail}.</P>
    <UrlFallback url={confirmUrl} />
    <Note>
      Didn't request this? Don't click the button, and{" "}
      <TextLink href={`${appUrl()}/settings/account`}>change your password</TextLink> right away.
    </Note>
  </LedgerLayout>
);
