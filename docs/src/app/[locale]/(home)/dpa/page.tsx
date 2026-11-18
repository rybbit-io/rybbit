import { LegalPageShell } from "@/components/LegalPageShell";
import { DPA_ANNEXES, DPA_PREAMBLE, DPA_SECTIONS, DPA_VERSION, RYBBIT_DPA_PARTY, type DpaListItem } from "@/lib/dpa";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

const description = "Rybbit Data Processing Agreement (DPA) - how we process data on your behalf";

export const metadata = createMetadata({
  title: "Data Processing Agreement",
  description,
  openGraph: {
    images: [createOGImageUrl("Data Processing Agreement", description)],
  },
  twitter: {
    images: [createOGImageUrl("Data Processing Agreement", description)],
  },
});

const lastUpdated = new Date(`${DPA_VERSION}T00:00:00Z`).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function ListItem({ item }: { item: DpaListItem }) {
  if (typeof item === "string") return <li>{item}</li>;
  return (
    <li>
      <strong>{item.term}</strong> {item.text}
    </li>
  );
}

// The text lives in src/lib/dpa.ts, a copy of shared/src/dpa.ts, so this page
// shows exactly what customers sign in the app.
export default function DataProcessingAgreement() {
  return (
    <LegalPageShell
      title="Data Processing Agreement"
      lastUpdated={lastUpdated}
      intro={
        <>
          Admins can sign this DPA in Rybbit under{" "}
          <a
            href="https://app.rybbit.io/settings/dpa"
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Settings → DPA
          </a>
          . It comes countersigned by us, takes effect when you sign, and works on every plan.
        </>
      }
    >
      <p>{DPA_PREAMBLE}</p>
      <p>
        <strong>Rybbit:</strong> {RYBBIT_DPA_PARTY.legalName}, {RYBBIT_DPA_PARTY.address.replace(/\n/g, ", ")}
      </p>
      {[...DPA_SECTIONS, ...DPA_ANNEXES].map(section => (
        <section key={section.title}>
          <h2 className="text-2xl font-semibold mt-8 mb-4">{section.title}</h2>
          {section.blocks.map((block, index) =>
            block.type === "p" ? (
              <p key={index}>{block.text}</p>
            ) : (
              <ul key={index} className="list-disc pl-6 space-y-2">
                {block.items.map((item, itemIndex) => (
                  <ListItem key={itemIndex} item={item} />
                ))}
              </ul>
            )
          )}
        </section>
      ))}
    </LegalPageShell>
  );
}
