import { DateTime } from "luxon";
import * as React from "react";
import { formatDate } from "../format.js";
import { H1, HELP_URL, LedgerLayout, Note, P, PrimaryButton, Rows } from "./ledger.js";

export interface SiteTransferEmailProps {
  email: string;
  /** Who sent it, as shown in the subject and heading: a name, or an email when there's no name. */
  sentBy: string;
  sentByEmail: string | null;
  siteDomain: string;
  organizationName: string;
  expiresAt: string;
  transferLink: string;
}

export const SiteTransferEmail = ({
  sentBy,
  sentByEmail,
  siteDomain,
  organizationName,
  expiresAt,
  transferLink,
}: SiteTransferEmailProps) => {
  const expires = formatDate(DateTime.fromISO(expiresAt));
  return (
    <LedgerLayout
      preview={`The site moves to you with all its data. The offer expires ${expires}.`}
      footer={[{ label: "Help", href: HELP_URL }]}
    >
      <H1>
        {sentBy} wants to transfer {siteDomain} to you
      </H1>
      <P>If you accept, the site moves to an organization you manage, with all its data and settings.</P>
      <Rows
        top={24}
        rows={[
          { label: "Site", value: siteDomain, strong: true },
          ...(organizationName ? [{ label: "From", value: organizationName }] : []),
          {
            label: "Sent by",
            value: sentByEmail && sentByEmail !== sentBy ? `${sentBy} (${sentByEmail})` : sentBy,
          },
          { label: "Expires", value: expires },
        ]}
      />
      <PrimaryButton label="Review the transfer" href={transferLink} />
      <Note>
        You'll need a Rybbit account with this email address to accept. If you weren't expecting this, you can ignore
        it.
      </Note>
    </LedgerLayout>
  );
};
