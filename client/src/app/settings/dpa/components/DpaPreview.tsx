import {
  DPA_ANNEXES,
  DPA_PREAMBLE,
  DPA_SECTIONS,
  DPA_TITLE,
  DPA_VERSION,
  RYBBIT_DPA_PARTY,
  type DpaCustomerDetails,
  type DpaSection,
} from "@rybbit/shared";
import { cn } from "@/lib/utils";

const BLANK = "text-neutral-400 dark:text-neutral-500";

function Party({ label, name, address }: { label: string; name: string; address: string }) {
  return (
    <div className="rounded-lg border border-neutral-150 p-3 dark:border-neutral-800">
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className={cn("mt-1 font-medium", !name && BLANK)}>{name || "Company legal name"}</div>
      <div className={cn("whitespace-pre-line", !address && BLANK)}>{address || "Registered address"}</div>
    </div>
  );
}

function SignatureBlock({ label, name, title }: { label: string; name: string; title: string }) {
  return (
    <div className="rounded-lg border border-neutral-150 p-3 dark:border-neutral-800">
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div
        className={cn(
          "mt-1 min-h-10 truncate border-b border-neutral-300 pb-1 font-serif text-2xl leading-10 italic dark:border-neutral-700",
          !name && BLANK
        )}
      >
        {name || "Your name"}
      </div>
      <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
        {name || "Name"}
        {title ? `, ${title}` : ""}
      </div>
    </div>
  );
}

function Sections({ sections }: { sections: DpaSection[] }) {
  return sections.map(section => (
    <section key={section.title} className="space-y-2">
      <h4 className="font-semibold text-neutral-950 dark:text-neutral-50">{section.title}</h4>
      {section.blocks.map((block, index) =>
        block.type === "p" ? (
          <p key={index}>{block.text}</p>
        ) : (
          <ul key={index} className="list-disc space-y-1 pl-5">
            {block.items.map((item, itemIndex) =>
              typeof item === "string" ? (
                <li key={itemIndex}>{item}</li>
              ) : (
                <li key={itemIndex}>
                  <span className="font-medium">{item.term}</span> {item.text}
                </li>
              )
            )}
          </ul>
        )
      )}
    </section>
  ));
}

/**
 * The agreement as it will be signed, with the customer's details filled in as they type.
 * The text itself stays in English: it's the binding document, the same one the PDF prints.
 */
export function DpaPreview({ details }: { details: DpaCustomerDetails }) {
  return (
    <article lang="en" className="space-y-4 text-sm leading-6 text-neutral-800 dark:text-neutral-200">
      <header>
        <h3 className="text-lg font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">{DPA_TITLE}</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Version {DPA_VERSION}</p>
      </header>
      <p>{DPA_PREAMBLE}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Party label="Customer" name={details.companyName} address={details.companyAddress} />
        <Party label="Rybbit" name={RYBBIT_DPA_PARTY.legalName} address={RYBBIT_DPA_PARTY.address} />
      </div>
      <Sections sections={DPA_SECTIONS} />
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <SignatureBlock
          label={`For the Customer${details.companyName ? `: ${details.companyName}` : ""}`}
          name={details.signerName}
          title={details.signerTitle}
        />
        <SignatureBlock
          label={`For Rybbit: ${RYBBIT_DPA_PARTY.legalName}`}
          name={RYBBIT_DPA_PARTY.signatoryName}
          title={RYBBIT_DPA_PARTY.signatoryTitle}
        />
      </div>
      <Sections sections={DPA_ANNEXES} />
    </article>
  );
}
