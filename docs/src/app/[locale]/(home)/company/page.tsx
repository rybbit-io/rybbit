import { Building2, Mail, MapPin } from "lucide-react";
import { GridCrosses } from "@/components/GridCrosses";
import { LegalPageShell } from "@/components/LegalPageShell";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

const description = "Legal entity and contact information for the company operating Rybbit";

export const metadata = createMetadata({
  title: "Company Information",
  description,
  openGraph: {
    images: [createOGImageUrl("Company Information", description)],
  },
  twitter: {
    images: [createOGImageUrl("Company Information", description)],
  },
});

const companyDetails = [
  {
    icon: Building2,
    label: "Legal entity",
    value: "Tomato.gg LLC",
  },
  {
    icon: MapPin,
    label: "Mailing address",
    value: (
      <address className="not-italic">
        1276 Rothwell Dr
        <br />
        Troy, MI 48084
        <br />
        United States
      </address>
    ),
  },
  {
    icon: Mail,
    label: "Contact",
    value: (
      <a href="mailto:hello@rybbit.com" className="font-medium">
        hello@rybbit.com
      </a>
    ),
  },
];

export default function CompanyInformation() {
  return (
    <LegalPageShell
      title="Company Information"
      intro="The legal and contact details for the company behind Rybbit."
    >
      <p>
        Rybbit is operated by <strong>Tomato.gg LLC</strong>, a United States limited liability company.
      </p>

      <div className="not-prose relative mt-10 border-y border-neutral-200 dark:border-neutral-800">
        <GridCrosses />
        <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {companyDetails.map(({ icon: Icon, label, value }) => (
            <div key={label} className="grid gap-3 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
              <dt className="flex items-center gap-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </dt>
              <dd className="text-base leading-7 text-neutral-950 dark:text-neutral-50">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <h2 className="mt-10 text-2xl font-semibold">About Rybbit</h2>
      <p>
        Rybbit is an open-source, privacy-friendly web and product analytics platform. Tomato.gg LLC provides the
        hosted Rybbit service and related customer support.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Business inquiries</h2>
      <p>
        For billing, vendor verification, partnership, or other business questions, email us at{" "}
        <a href="mailto:hello@rybbit.com">hello@rybbit.com</a>.
      </p>
    </LegalPageShell>
  );
}
