import {
  DPA_ANNEXES,
  DPA_PREAMBLE,
  DPA_SECTIONS,
  DPA_TITLE,
  DPA_VERSION,
  RYBBIT_DPA_PARTY,
  type DpaCustomerDetails,
  type DpaParty,
  type DpaListItem,
  type DpaSection,
} from "@rybbit/shared";
import { DateTime } from "luxon";
import * as React from "react";

export interface DpaDocumentProps {
  agreementId: string;
  details: DpaCustomerDetails;
  /** ISO timestamp of the customer's signature. */
  signedAt: string;
  signerIp: string | null;
  /** The Rybbit account that signed, when it differs from the signer's email. */
  accountEmail: string | null;
  party?: DpaParty;
}

const CSS = `
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.5; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 4px; letter-spacing: -0.01em; }
  h2 { font-size: 11.5pt; margin: 20px 0 6px; break-after: avoid; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 8px; padding-left: 20px; }
  li { margin-bottom: 3px; }
  .meta { color: #555; font-size: 9pt; margin-bottom: 18px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 0 6px; }
  .party { border: 1px solid #ccc; padding: 10px 12px; }
  .label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin-bottom: 4px; }
  .party-name { font-weight: bold; }
  .address { white-space: pre-line; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; break-inside: avoid; }
  .signature-box { border: 1px solid #ccc; padding: 10px 12px; }
  .signature { font-style: italic; font-size: 20pt; line-height: 1.2; min-height: 40px; border-bottom: 1px solid #111; margin: 4px 0 8px; overflow-wrap: anywhere; }
  .field { display: grid; grid-template-columns: 52px 1fr; gap: 6px; font-size: 9.5pt; }
  .field span:first-child { color: #666; }
  .record { margin-top: 18px; border-top: 1px solid #ccc; padding-top: 10px; font-family: Helvetica, Arial, sans-serif; font-size: 8pt; color: #444; break-inside: avoid; }
  .annexes { break-before: page; }
  .annexes section:first-child h2 { margin-top: 0; }
  .record h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px; }
  .record .field { grid-template-columns: 130px 1fr; font-size: 8pt; }
`;

const ListItem = ({ item }: { item: DpaListItem }) =>
  typeof item === "string" ? (
    <li>{item}</li>
  ) : (
    <li>
      <strong>{item.term}</strong> {item.text}
    </li>
  );

const Sections = ({ sections }: { sections: DpaSection[] }) => (
  <>
    {sections.map(section => (
      <section key={section.title}>
        <h2>{section.title}</h2>
        {section.blocks.map((block, index) =>
          block.type === "p" ? (
            <p key={index}>{block.text}</p>
          ) : (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <ListItem key={itemIndex} item={item} />
              ))}
            </ul>
          )
        )}
      </section>
    ))}
  </>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="field">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export const DpaDocument = ({
  agreementId,
  details,
  signedAt,
  signerIp,
  accountEmail,
  party = RYBBIT_DPA_PARTY,
}: DpaDocumentProps): React.ReactElement => {
  const signed = DateTime.fromISO(signedAt, { zone: "utc" });
  const signedDate = signed.toFormat("d LLLL yyyy");

  return (
    <div>
      <style>{CSS}</style>
      <h1>{DPA_TITLE}</h1>
      <div className="meta">
        Version {DPA_VERSION} · Document {agreementId}
      </div>

      <p>{DPA_PREAMBLE}</p>
      <div className="parties">
        <div className="party">
          <div className="label">Customer</div>
          <div className="party-name">{details.companyName}</div>
          <div className="address">{details.companyAddress}</div>
        </div>
        <div className="party">
          <div className="label">Rybbit</div>
          <div className="party-name">{party.legalName}</div>
          <div className="address">{party.address}</div>
        </div>
      </div>

      <Sections sections={DPA_SECTIONS} />

      <div className="signatures">
        <div className="signature-box">
          <div className="label">For the Customer: {details.companyName}</div>
          <div className="signature">{details.signerName}</div>
          <Field label="Name" value={details.signerName} />
          <Field label="Title" value={details.signerTitle} />
          <Field label="Email" value={details.signerEmail} />
          <Field label="Date" value={signedDate} />
        </div>
        <div className="signature-box">
          <div className="label">For Rybbit: {party.legalName}</div>
          <div className="signature">{party.signatoryName}</div>
          <Field label="Name" value={party.signatoryName} />
          <Field label="Title" value={party.signatoryTitle} />
          <Field label="Date" value={signedDate} />
        </div>
      </div>

      <div className="record">
        <h3>Electronic signature record</h3>
        <Field label="Document ID" value={agreementId} />
        <Field label="DPA version" value={DPA_VERSION} />
        <Field label="Signed (UTC)" value={signed.toFormat("yyyy-LL-dd HH:mm:ss 'UTC'")} />
        <Field label="Signed by" value={`${details.signerName} <${details.signerEmail}>`} />
        {accountEmail && <Field label="Rybbit account" value={accountEmail} />}
        {signerIp && <Field label="IP address" value={signerIp} />}
        <Field label="Countersignature" value={`Applied by Rybbit when the document was issued, ${signedDate}`} />
      </div>

      <div className="annexes">
        <Sections sections={DPA_ANNEXES} />
      </div>
    </div>
  );
};
