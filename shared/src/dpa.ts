// The Data Processing Agreement customers sign in Settings → DPA.
//
// One source for the text: the client renders it as the preview the signer
// reads, and the server renders the same blocks into the countersigned PDF.
// The public reading copy at rybbit.com/dpa renders docs/src/lib/dpa.ts, a
// byte-for-byte copy of this file (the docs site sits outside the workspace);
// shared/src/dpa.test.ts fails when the two drift. Bump DPA_VERSION whenever
// the text changes so each signature records which version it covers.

/** The text's "last updated" date. Stored with every signature. */
export const DPA_VERSION = "2026-11-17";

export interface DpaParty {
  legalName: string;
  address: string;
  signatoryName: string;
  signatoryTitle: string;
}

/**
 * Rybbit's side of the agreement, printed in the parties block and signed in
 * the countersignature. Entity and address match rybbit.com/company.
 */
export const RYBBIT_DPA_PARTY: DpaParty = {
  legalName: "Tomato.gg LLC",
  address: "1276 Rothwell Dr\nTroy, MI 48084\nUnited States",
  signatoryName: "Zeyu Yang",
  signatoryTitle: "CEO",
};

/** Longest accepted value for each field the customer fills in. */
export const DPA_FIELD_LIMITS = {
  companyName: 200,
  companyAddress: 500,
  signerName: 120,
  signerTitle: 120,
  signerEmail: 254,
} as const;

/** What the customer fills in before signing. */
export interface DpaCustomerDetails {
  companyName: string;
  companyAddress: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
}

export type DpaListItem = string | { term: string; text: string };

export type DpaBlock = { type: "p"; text: string } | { type: "ul"; items: DpaListItem[] };

export interface DpaSection {
  title: string;
  blocks: DpaBlock[];
}

const p = (text: string): DpaBlock => ({ type: "p", text });
const ul = (...items: DpaListItem[]): DpaBlock => ({ type: "ul", items });

export const DPA_TITLE = "Data Processing Agreement";

export const DPA_PREAMBLE =
  'This Data Processing Agreement ("DPA") is entered into between the customer named below ("Customer") and the company that operates Rybbit, also named below ("Rybbit"). It forms part of the agreement under which Rybbit provides its hosted analytics services (the "Services") to Customer, made up of the Terms of Service at rybbit.com/terms-and-conditions and any order form between the parties (together, the "Agreement"). It takes effect on the date Customer signs it.';

export const DPA_SECTIONS: DpaSection[] = [
  {
    title: "1. Definitions",
    blocks: [
      ul(
        {
          term: '"Customer Personal Data"',
          text: "means personal data that Rybbit processes on behalf of Customer through the Services, as described in Annex I.",
        },
        {
          term: '"Data Protection Laws"',
          text: 'means all laws that apply to the processing of Customer Personal Data under the Agreement, including Regulation (EU) 2016/679 ("GDPR"), the GDPR as it forms part of UK law and the UK Data Protection Act 2018 ("UK GDPR"), the Swiss Federal Act on Data Protection ("FADP"), and US state privacy laws such as the California Consumer Privacy Act ("CCPA").',
        },
        {
          term: '"Sub-processor"',
          text: "means a third party that Rybbit engages to process Customer Personal Data.",
        },
        {
          term: '"Security Incident"',
          text: "means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, Customer Personal Data.",
        },
        {
          term: '"SCCs"',
          text: "means the standard contractual clauses approved by the European Commission in Implementing Decision (EU) 2021/914.",
        },
        {
          term: '"UK Addendum"',
          text: "means the International Data Transfer Addendum to the SCCs issued by the UK Information Commissioner (version B1.0).",
        },
        '"Controller", "processor", "personal data", "processing", "data subject" and "supervisory authority" have the meanings given in the GDPR.'
      ),
    ],
  },
  {
    title: "2. Scope and roles",
    blocks: [
      p(
        "This DPA applies to Customer Personal Data. Customer is the controller of that data, or a processor acting for its own clients. Rybbit is Customer's processor, or its sub-processor where Customer is itself a processor. Where Customer acts as a processor, Customer confirms that its controller has authorized Customer's instructions and Customer's use of Rybbit, including the Sub-processors in Annex III."
      ),
      p(
        "This DPA does not cover data that Rybbit processes as a controller to run its own business, such as account, billing and support records about Customer's team. Rybbit's Privacy Policy at rybbit.com/privacy covers that data."
      ),
      p(
        "Annex I describes the subject matter, nature, purpose and duration of the processing, the types of Customer Personal Data and the categories of data subjects."
      ),
    ],
  },
  {
    title: "3. Customer's instructions",
    blocks: [
      p(
        "Rybbit processes Customer Personal Data only on Customer's documented instructions, including with regard to transfers to third countries, unless the law that applies to Rybbit requires otherwise. In that case Rybbit will tell Customer about the legal requirement before processing, unless that law prohibits it."
      ),
      p(
        "The Agreement, this DPA, and Customer's configuration and use of the Services are Customer's complete instructions. They include processing needed to provide, secure and maintain the Services, such as detecting and filtering bot and spam traffic and preventing abuse."
      ),
      p("Rybbit will tell Customer promptly if, in its opinion, an instruction infringes Data Protection Laws."),
    ],
  },
  {
    title: "4. Customer's responsibilities",
    blocks: [
      p(
        "Customer is responsible for having a lawful basis for the processing, for giving data subjects the notices and obtaining the consents that Data Protection Laws require, and for the lawfulness of the data it chooses to send to the Services."
      ),
      p(
        "Customer will not use the Services to send Rybbit special categories of personal data (Article 9 GDPR), personal data about criminal convictions or offences, government identification numbers, or payment card data, and will configure features such as user identification, custom event properties and session replay accordingly."
      ),
    ],
  },
  {
    title: "5. Confidentiality",
    blocks: [
      p(
        "Rybbit ensures that everyone it authorizes to process Customer Personal Data is bound by an obligation of confidentiality and accesses the data only as needed to provide the Services or to support Customer."
      ),
    ],
  },
  {
    title: "6. Security",
    blocks: [
      p(
        "Rybbit implements and maintains the technical and organizational measures in Annex II, which are designed to ensure a level of security appropriate to the risk, as Article 32 GDPR requires. Rybbit may update these measures as long as the overall level of protection does not decrease."
      ),
    ],
  },
  {
    title: "7. Sub-processors",
    blocks: [
      p(
        "Customer gives Rybbit general authorization to engage Sub-processors. The Sub-processors at the date of this DPA are listed in Annex III, and the current list is published at rybbit.com/subprocessors."
      ),
      p(
        "Rybbit will notify Customer at least 30 days before adding or replacing a Sub-processor, by email to the owners of Customer's Rybbit organization and by updating rybbit.com/subprocessors. Customer may object on reasonable data protection grounds within those 30 days. The parties will then discuss Customer's concerns in good faith. If they cannot resolve them, Customer may terminate the affected Services by written notice and receive a refund of any prepaid fees for the period after termination."
      ),
      p(
        "Rybbit imposes on each Sub-processor, by written contract, data protection obligations no less protective than those in this DPA, and remains fully liable to Customer for each Sub-processor's performance of those obligations."
      ),
    ],
  },
  {
    title: "8. Data subject requests",
    blocks: [
      p(
        "Taking into account the nature of the processing, Rybbit will assist Customer by appropriate technical and organizational measures, insofar as possible, in responding to requests from data subjects to exercise their rights under Data Protection Laws. The Services let Customer export its data and delete the data of individual users or of whole sites itself."
      ),
      p(
        "If Rybbit receives such a request directly, it will refer the data subject to Customer and will not otherwise respond, unless the law requires it to."
      ),
    ],
  },
  {
    title: "9. Security Incidents",
    blocks: [
      p(
        "Rybbit will notify Customer without undue delay, and in any event within 48 hours, after becoming aware of a Security Incident. The notice will go by email to the owners of Customer's Rybbit organization and will describe, as far as then known, the nature of the Security Incident, the categories and approximate number of data subjects and records concerned, its likely consequences, the measures taken or proposed to address it, and a contact point for more information. Rybbit will update Customer as more information becomes available."
      ),
      p(
        "Rybbit will take reasonable steps to contain, investigate and remedy each Security Incident, and will assist Customer in meeting its own obligations to notify supervisory authorities and data subjects. Notifying a Security Incident is not an admission of fault or liability."
      ),
    ],
  },
  {
    title: "10. Assistance with compliance",
    blocks: [
      p(
        "Taking into account the nature of the processing and the information available to it, Rybbit will provide Customer with reasonable assistance with Customer's obligations under Articles 32 to 36 GDPR, including data protection impact assessments and prior consultations with supervisory authorities, to the extent Customer cannot meet them with the information already available to it."
      ),
    ],
  },
  {
    title: "11. International transfers",
    blocks: [
      p(
        "Rybbit hosts the Services' databases in the European Union. Rybbit is established in the United States, and some Sub-processors process data in other countries, as listed in Annex III."
      ),
      p(
        "Where processing under this DPA involves a transfer of Customer Personal Data from the European Economic Area to a country that does not have an adequacy decision, the SCCs are incorporated into this DPA as follows:"
      ),
      ul(
        "Module Two (controller to processor) applies where Customer is a controller, and Module Three (processor to processor) applies where Customer is a processor.",
        "Customer is the data exporter and Rybbit is the data importer.",
        "The optional docking clause in Clause 7 applies.",
        "In Clause 9, Option 2 (general written authorization) applies, with the notice period set out in Section 7 of this DPA.",
        "The optional language in Clause 11 does not apply.",
        "In Clause 13, the competent supervisory authority is determined in accordance with that clause.",
        "In Clause 17, Option 1 applies, and the SCCs are governed by the law of Ireland.",
        "In Clause 18, disputes are resolved by the courts of Ireland.",
        "Annexes I, II and III of the SCCs are completed with the information in Annexes I, II and III of this DPA."
      ),
      p(
        "For transfers from the United Kingdom, the UK Addendum applies. Its Tables 1 to 3 are completed with the information in this DPA and its Annexes, and for Table 4, either party may end the UK Addendum as its Section 19 allows."
      ),
      p(
        'For transfers from Switzerland, the SCCs apply with these changes: references to the GDPR are read as references to the FADP, the Swiss Federal Data Protection and Information Commissioner is the competent supervisory authority for those transfers, and the term "Member State" does not prevent data subjects in Switzerland from bringing claims in their place of habitual residence.'
      ),
      p(
        "If the SCCs conflict with any other part of the Agreement or this DPA, the SCCs prevail. If a transfer mechanism relied on under this Section is invalidated, the parties will cooperate to put in place a valid alternative."
      ),
    ],
  },
  {
    title: "12. US state privacy laws",
    blocks: [
      p(
        "To the extent the CCPA or similar US state privacy laws apply to Customer Personal Data, Rybbit is Customer's service provider or processor under those laws. Rybbit will not sell or share Customer Personal Data; will not retain, use or disclose it for any purpose other than the business purposes set out in the Agreement, or outside the direct business relationship between the parties; and will not combine it with personal information it receives from other sources, except as those laws permit."
      ),
      p(
        "Rybbit will comply with the obligations those laws place on service providers and processors, provide the level of privacy protection they require, and notify Customer if it determines that it can no longer meet its obligations under them. Customer may then take reasonable and appropriate steps to stop and remediate any unauthorized use of Customer Personal Data. Rybbit certifies that it understands and will comply with the restrictions in this Section."
      ),
    ],
  },
  {
    title: "13. AI-assisted features",
    blocks: [
      p(
        "Rybbit does not use Customer Personal Data to train artificial intelligence models. Rybbit's AI-assisted features send the text that Customer's users enter into them, together with the relevant database schema, to the AI Sub-processor listed in Annex III. They do not send the analytics data stored in the Services."
      ),
    ],
  },
  {
    title: "14. Deletion and return",
    blocks: [
      p(
        "During the term of the Agreement, Customer can export Customer Personal Data using the Services and their API, and delete it by deleting individual users or whole sites in the Services."
      ),
      p(
        "After the Agreement ends, Rybbit will, at Customer's choice, delete or return Customer Personal Data within 30 days of Customer's written request. Copies held in backups are deleted as the backups expire, within 14 days, and are not otherwise processed in the meantime. Rybbit may keep Customer Personal Data only where the law requires it, and will continue to protect that data under this DPA for as long as it does."
      ),
    ],
  },
  {
    title: "15. Audits",
    blocks: [
      p(
        "Rybbit will make available to Customer all information necessary to demonstrate compliance with Article 28 GDPR and this DPA, and will allow for and contribute to audits, including inspections, conducted by Customer or an independent auditor Customer mandates."
      ),
      p(
        "Customer will first rely on the written information and documentation Rybbit provides, where that is sufficient. Any audit beyond that requires at least 30 days' written notice, takes place no more than once a year (unless a supervisory authority requires it or it follows a Security Incident), is carried out during business hours under appropriate confidentiality obligations, and is at Customer's expense."
      ),
    ],
  },
  {
    title: "16. Liability, precedence and term",
    blocks: [
      p(
        "Each party's liability under this DPA is subject to the limitations and exclusions of liability in the Agreement, except where Data Protection Laws or the SCCs do not allow such a limitation."
      ),
      p(
        "On matters concerning the processing of Customer Personal Data, the SCCs (where they apply) prevail over this DPA, and this DPA prevails over the rest of the Agreement."
      ),
      p(
        "This DPA remains in effect for as long as Rybbit processes Customer Personal Data. Except for the SCCs, it is governed by the same law as the Agreement."
      ),
    ],
  },
  {
    title: "17. Contact",
    blocks: [p("Questions and notices about this DPA can be sent to Rybbit through rybbit.com/contact.")],
  },
  {
    title: "18. Signatures",
    blocks: [
      p(
        "The parties sign this DPA electronically and agree that electronic signatures bind them as handwritten ones would. Rybbit signed this DPA before issuing it to Customer. The person signing for Customer confirms that they are authorized to bind Customer."
      ),
    ],
  },
];

/** Printed after the signatures; part of the agreement all the same. */
export const DPA_ANNEXES: DpaSection[] = [
  {
    title: "Annex I: Description of the processing",
    blocks: [
      ul(
        {
          term: "Parties:",
          text: "Customer (data exporter; controller, or processor for its own clients) and Rybbit (data importer; processor or sub-processor), as named and signed above. Their activities are the provision and use of the Services.",
        },
        {
          term: "Data subjects:",
          text: "Visitors to and users of Customer's websites and apps on which Customer installs Rybbit's tracking script or SDKs, including end users that Customer identifies to the Services.",
        },
        {
          term: "Usage data:",
          text: "Page views, custom events and their properties, outbound link clicks, JavaScript errors, performance metrics, and feature flag and experiment assignments, with the page URL, path, query string, page title, referrer, campaign (UTM) parameters and timestamps.",
        },
        {
          term: "Device data:",
          text: "Browser, operating system and their versions, device type, screen size, language and time zone.",
        },
        {
          term: "Location data:",
          text: "Country, region, city and approximate coordinates derived from the IP address, and the network (ASN) a request came from.",
        },
        {
          term: "IP addresses:",
          text: "Used when data is collected to derive location and the visitor identifier and to detect bots. Not stored, unless Customer turns on IP tracking for a site.",
        },
        {
          term: "Identifiers:",
          text: "A pseudonymous visitor ID, created as a one-way hash of the IP address and user agent (with a salt that rotates daily, if Customer turns that on) or of an anonymous ID kept on the device (if Customer enables persistent IDs); a session ID; and any user ID and traits, such as a name or email address, that Customer sends to identify its users.",
        },
        {
          term: "Session replays:",
          text: "Where Customer enables session replay, recordings of page structure, content and interactions. Form inputs are masked by default.",
        },
        {
          term: "Sensitive data:",
          text: "None. Customer must not send special categories of personal data (Section 4).",
        },
        { term: "Frequency:", text: "Continuous, as data subjects use Customer's websites and apps." },
        {
          term: "Nature of the processing:",
          text: "Collection, storage, aggregation, analysis, display, export and deletion.",
        },
        {
          term: "Purpose:",
          text: "Providing Customer with web and product analytics, session replay and related features under the Agreement, and securing the Services.",
        },
        {
          term: "Duration and retention:",
          text: "For the term of the Agreement, until Customer deletes the data, and afterwards as set out in Section 14.",
        },
        {
          term: "Transfers to Sub-processors:",
          text: "As listed in Annex III, for the purposes listed there and for the duration above.",
        },
        {
          term: "Competent supervisory authority:",
          text: "Determined in accordance with Clause 13 of the SCCs.",
        }
      ),
    ],
  },
  {
    title: "Annex II: Technical and organizational security measures",
    blocks: [
      ul(
        {
          term: "Encryption in transit:",
          text: "All traffic between browsers, apps and API clients and the Services uses TLS.",
        },
        {
          term: "Network security:",
          text: "Production databases are not reachable from the public internet. Firewalls admit only Rybbit's own application servers.",
        },
        {
          term: "Staff access:",
          text: "Access to production systems is limited to authorized Rybbit personnel who need it for their role, who are bound by confidentiality obligations.",
        },
        {
          term: "Customer access controls:",
          text: "Role-based permissions (owner, admin, editor, member and viewer), per-site access grants, scoped API keys, and passwords stored only as salted hashes.",
        },
        {
          term: "Tenant separation:",
          text: "Every request is checked against the sites the caller may access. Custom SQL queries run as a restricted database user that can read only the caller's permitted sites.",
        },
        {
          term: "Data minimization:",
          text: "No cookies by default, no stored IP addresses by default, hashed visitor identifiers, and session replay inputs masked by default.",
        },
        {
          term: "Backups:",
          text: "Regular backups to an access-restricted, encrypted bucket with a separate provider (Annex III), so data can be restored after an incident.",
        },
        {
          term: "Vulnerability management:",
          text: "Security updates are applied to Rybbit's software, its dependencies, and its database servers.",
        },
        {
          term: "Monitoring and incident response:",
          text: "Production systems are monitored, and Security Incidents are handled and notified as described in Section 9.",
        }
      ),
    ],
  },
  {
    title: "Annex III: Sub-processors",
    blocks: [
      ul(
        {
          term: "Hetzner Online GmbH:",
          text: "Application servers, databases and backups. All Customer Personal Data. Germany and Finland (EU).",
        },
        {
          term: "Cloudflare, Inc.:",
          text: "Content delivery, DNS, DDoS protection, and storage of session replay recordings. Network traffic (IP addresses and request headers in transit) and session replays. Global edge network; United States.",
        },
        {
          term: "Backblaze, Inc.:",
          text: "Encrypted off-site backups. Copies of Customer Personal Data. Netherlands (EU).",
        },
        {
          term: "OpenRouter, Inc.:",
          text: "Routes requests from AI-assisted features to large language model providers. Text that users enter into AI features and database schema (Section 13). United States, with model providers in other countries.",
        },
        {
          term: "Resend, Inc.:",
          text: "Transactional and report emails. Recipients' email addresses and email contents, which can include analytics reports. United States.",
        },
        {
          term: "Google LLC (Google Workspace):",
          text: "Support and business email. The contents of messages Customer sends to Rybbit. United States.",
        }
      ),
      p(
        "Service providers that handle only data Rybbit processes as a controller, such as Stripe for billing, are not Sub-processors under this DPA. They are listed at rybbit.com/subprocessors."
      ),
    ],
  },
];
