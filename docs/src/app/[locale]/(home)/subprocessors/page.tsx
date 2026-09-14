import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

const DESCRIPTION =
  "The third-party subprocessors Rybbit uses to deliver its web analytics service, what each one does, and where it processes data.";

export const metadata = createMetadata({
  title: "Subprocessors",
  description: DESCRIPTION,
  openGraph: {
    images: [createOGImageUrl("Subprocessors", DESCRIPTION)],
  },
  twitter: {
    images: [createOGImageUrl("Subprocessors", DESCRIPTION)],
  },
});

interface Subprocessor {
  name: string;
  entity: string;
  purpose: string;
  data: string;
  location: string;
  website: string;
}

const infrastructure: Subprocessor[] = [
  {
    name: "Hetzner",
    entity: "Hetzner Online GmbH",
    purpose: "Cloud infrastructure: application servers, databases, and backups that run the Rybbit service.",
    data: "All customer account data and analytics data collected on your behalf.",
    location: "Germany and Finland (EU)",
    website: "https://www.hetzner.com",
  },
  {
    name: "Cloudflare",
    entity: "Cloudflare, Inc.",
    purpose: "Content delivery network, DNS, DDoS protection, and object storage.",
    data: "Network traffic metadata (IP addresses in transit, request headers) and stored objects such as session replay recordings.",
    location: "United States (global edge network)",
    website: "https://www.cloudflare.com",
  },
];

const operations: Subprocessor[] = [
  {
    name: "Stripe",
    entity: "Stripe, Inc.",
    purpose: "Payment processing, subscription billing, and invoicing.",
    data: "Billing name, email address, billing address, and payment details. Rybbit never stores card numbers.",
    location: "United States",
    website: "https://stripe.com",
  },
  {
    name: "Resend",
    entity: "Resend, Inc.",
    purpose: "Transactional and product email delivery (account, billing, alerts, and reports).",
    data: "Email address, name, and the contents of the emails we send you.",
    location: "United States",
    website: "https://resend.com",
  },
  {
    name: "Google Workspace (Gmail)",
    entity: "Google LLC",
    purpose: "Business email for support and customer correspondence.",
    data: "Name, email address, and the contents of messages you send to us.",
    location: "United States",
    website: "https://workspace.google.com",
  },
];

const ai: Subprocessor[] = [
  {
    name: "Anthropic",
    entity: "Anthropic, PBC",
    purpose: "Large language model provider for AI-assisted features.",
    data: "Content you submit to AI features and the analytics data those features summarize. Not used to train models.",
    location: "United States",
    website: "https://www.anthropic.com",
  },
  {
    name: "OpenAI",
    entity: "OpenAI, L.L.C.",
    purpose: "Large language model provider for AI-assisted features.",
    data: "Content you submit to AI features and the analytics data those features summarize. Not used to train models.",
    location: "United States",
    website: "https://openai.com",
  },
];

function SubprocessorTable({ rows }: { rows: Subprocessor[] }) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th scope="col" className="px-4 py-3">
              Subprocessor
            </th>
            <th scope="col" className="px-4 py-3">
              Purpose
            </th>
            <th scope="col" className="px-4 py-3">
              Data processed
            </th>
            <th scope="col" className="px-4 py-3">
              Location
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.map(row => (
            <tr key={row.name} className="align-top">
              <td className="px-4 py-3">
                <a
                  href={row.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-neutral-950 hover:underline dark:text-neutral-50"
                >
                  {row.name}
                </a>
                <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{row.entity}</div>
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{row.purpose}</td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{row.data}</td>
              <td className="whitespace-nowrap px-4 py-3 text-neutral-700 dark:text-neutral-300">{row.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Subprocessors() {
  return (
    <LegalPageShell
      title="Subprocessors"
      lastUpdated="September 13, 2026"
      intro="The third parties we rely on to run Rybbit, what each one does, and where it processes data."
    >
      <p>
        Rybbit uses a small number of third-party service providers (&quot;subprocessors&quot;) to deliver the Rybbit
        cloud service. Each subprocessor processes personal data only to the extent needed to provide its service to
        us, under a written agreement that imposes data protection obligations at least as protective as those in our{" "}
        <Link href="/dpa">Data Processing Agreement</Link>.
      </p>
      <p>
        This page lists every subprocessor that may process customer personal data. If you self-host Rybbit, none of
        these providers receive your data.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Infrastructure</h2>
      <p>These providers host and serve the Rybbit application and the analytics data collected on your behalf.</p>
      <SubprocessorTable rows={infrastructure} />

      <h2 className="text-2xl font-semibold mt-8 mb-4">Billing, email, and support</h2>
      <p>These providers process account holder data, not the analytics data collected from your visitors.</p>
      <SubprocessorTable rows={operations} />

      <h2 className="text-2xl font-semibold mt-8 mb-4">AI features</h2>
      <p>
        These providers are only used when you use an AI-assisted feature. Data sent to them is limited to the request
        you make and the analytics data needed to answer it. Our agreements with these providers prohibit using your
        data to train their models.
      </p>
      <SubprocessorTable rows={ai} />

      <h2 className="text-2xl font-semibold mt-8 mb-4">International transfers</h2>
      <p>
        Analytics data is stored on Hetzner servers in the European Union. Where a subprocessor processes personal
        data outside the European Economic Area, we rely on the European Commission&apos;s Standard Contractual Clauses
        or, where applicable, the EU-U.S. Data Privacy Framework.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to this list</h2>
      <p>
        We will update this page before adding or replacing a subprocessor. Customers with a signed Data Processing
        Agreement will be notified by email at least 30 days in advance and may object to the change as described in
        the DPA. To receive notifications, email{" "}
        <a href="mailto:hello@rybbit.com">hello@rybbit.com</a> with the subject line &quot;Subprocessor
        notifications&quot;.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Change log</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>September 13, 2026:</strong> Published this page. Added Google Workspace (Gmail), Anthropic, and
          OpenAI to the list previously maintained in the DPA.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
      <p>
        Questions about our subprocessors or data handling? Email us at{" "}
        <a href="mailto:hello@rybbit.com">hello@rybbit.com</a>.
      </p>
    </LegalPageShell>
  );
}
