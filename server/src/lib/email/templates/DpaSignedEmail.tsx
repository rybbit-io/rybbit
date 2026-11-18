import { DateTime } from "luxon";
import * as React from "react";
import { appUrl, formatDateTime } from "../format.js";
import { H1, HELP_URL, LedgerLayout, Note, P, Rows } from "./ledger.js";

export interface DpaSignedEmailProps {
  agreementId: string;
  companyName: string;
  signerName: string;
  signerTitle: string;
  signedAt: string;
}

export const dpaSignedSubject = (companyName: string) => `Your signed Rybbit DPA for ${companyName}`;

export const DpaSignedEmail = ({
  agreementId,
  companyName,
  signerName,
  signerTitle,
  signedAt,
}: DpaSignedEmailProps) => (
  <LedgerLayout
    preview="The countersigned PDF is attached."
    footer={[
      { label: "DPA settings", href: `${appUrl()}/settings/dpa` },
      { label: "Help", href: HELP_URL },
    ]}
  >
    <H1>Your DPA is signed</H1>
    <P>
      Here's the Data Processing Agreement between {companyName} and Rybbit, countersigned by us and attached as a PDF.
      It took effect when {signerName} signed it.
    </P>
    <Rows
      top={24}
      rows={[
        { label: "Company", value: companyName, strong: true },
        { label: "Signed by", value: signerTitle ? `${signerName}, ${signerTitle}` : signerName },
        { label: "Signed", value: formatDateTime(DateTime.fromISO(signedAt)) },
        { label: "Document", value: agreementId },
      ]}
    />
    <Note>
      Keep this PDF for your records. We don't keep a copy in your account, so if you lose it, an admin can sign again
      in Settings → DPA.
    </Note>
  </LedgerLayout>
);
