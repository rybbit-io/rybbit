import { DateTime } from "luxon";
import * as React from "react";
import { formatDateTime } from "../format.js";
import { H1, HELP_URL, LedgerLayout, Note, P, PrimaryButton, Rows } from "./ledger.js";

interface InvitationEmailProps {
  inviterName: string | null;
  inviterEmail: string;
  organizationName: string;
  role: string;
  expiresAt: Date;
  inviteLink: string;
}

/** "Sam Chen" when the inviter has a real name, otherwise their email. */
export const inviterLabel = (name: string | null, email: string) =>
  name && name.trim() && !name.includes("@") ? name.trim() : email;

const roleLabel = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

export const InvitationEmail = ({
  inviterName,
  inviterEmail,
  organizationName,
  role,
  expiresAt,
  inviteLink,
}: InvitationEmailProps) => {
  const inviter = inviterLabel(inviterName, inviterEmail);
  const expires = formatDateTime(DateTime.fromJSDate(expiresAt));
  return (
    <LedgerLayout
      preview={`Join as ${/^[aeiou]/i.test(role) ? "an" : "a"} ${role}. The invitation expires ${expires}.`}
      footer={[{ label: "Help", href: HELP_URL }]}
    >
      <H1>Join {organizationName} on Rybbit</H1>
      <P>
        {inviter === inviterEmail ? inviterEmail : `${inviter} (${inviterEmail})`} invited you to join{" "}
        {organizationName}.
      </P>
      <Rows
        top={24}
        rows={[
          { label: "Organization", value: organizationName },
          { label: "Role", value: roleLabel(role) },
          { label: "Expires", value: expires },
        ]}
      />
      <PrimaryButton label="Accept invitation" href={inviteLink} />
      <Note>If you don't have a Rybbit account yet, you'll create one when you accept.</Note>
    </LedgerLayout>
  );
};
