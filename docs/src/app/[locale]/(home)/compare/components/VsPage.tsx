import { CTASection } from "@/components/CTASection";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { ArrowRight, CheckCircle, ChevronDown, CircleMinus } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import React from "react";
import {
  canonicalFeatures,
  competitors,
  featureGroups,
  importableCompetitors,
  rybbit,
  type FeatureGroup,
  type FeatureValue,
  type ProductEntry,
} from "../data/competitors";
import type { VsExtraRow, VsLink, VsPair } from "../data/vsPairs";

interface TableRow {
  key: string;
  label: string;
  a: FeatureValue;
  b: FeatureValue;
  rybbit: FeatureValue;
}

interface TableSection {
  group: FeatureGroup;
  title: string;
  rows: TableRow[];
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(isoDate: string) {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

// "Heatmaps" -> "heatmaps", but "Web Vitals monitoring" and "API access" keep their capitals.
function inSentence(label: string) {
  const rest = label.slice(1);
  return rest === rest.toLowerCase() ? label.charAt(0).toLowerCase() + rest : label;
}

function joinList(items: string[], conjunction: "and" | "or") {
  if (items.length <= 2) return items.join(` ${conjunction} `);
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}

function isOffered(value: FeatureValue) {
  return value === true || typeof value === "string";
}

// Registry rows the pair selected, in canonical order, with the pair's verified extra rows
// slotted in after the feature they name (or at the end of their group).
function buildTableSections(pair: VsPair, a: ProductEntry, b: ProductEntry): TableSection[] {
  const selected = new Set<string>(pair.features);
  const extras = pair.extraRows ?? [];
  const toRow = (extra: VsExtraRow): TableRow => ({
    key: `extra-${extra.label}`,
    label: extra.label,
    a: extra.a,
    b: extra.b,
    rybbit: extra.rybbit,
  });

  return (Object.keys(featureGroups) as FeatureGroup[])
    .map(group => {
      const rows: TableRow[] = [];
      const placed = new Set<VsExtraRow>();
      for (const feature of canonicalFeatures) {
        if (feature.group !== group) continue;
        const aValue = a.features[feature.key];
        const bValue = b.features[feature.key];
        // A row where neither product is documented has nothing to compare.
        if (selected.has(feature.key) && (aValue !== undefined || bValue !== undefined)) {
          rows.push({
            key: feature.key,
            label: feature.label,
            a: aValue,
            b: bValue,
            rybbit: rybbit.features[feature.key],
          });
        }
        for (const extra of extras) {
          if (extra.group === group && extra.after === feature.key) {
            rows.push(toRow(extra));
            placed.add(extra);
          }
        }
      }
      for (const extra of extras) {
        if (extra.group === group && !placed.has(extra)) rows.push(toRow(extra));
      }
      return { group, title: featureGroups[group], rows };
    })
    .filter(section => section.rows.length > 0);
}

// The "third option" facts come from the registry, so they stay in sync with the Rybbit entry.
function buildThirdOptionFacts(sections: TableSection[], a: ProductEntry, b: ProductEntry) {
  const facts: { term: string; detail: React.ReactNode }[] = [{ term: "What it is", detail: rybbit.summary }];

  const gaps = sections
    .flatMap(section => section.rows)
    .filter(row => row.rybbit === false && (isOffered(row.a) || isOffered(row.b)));
  if (gaps.length > 0) {
    facts.push({
      term: "What it lacks here",
      detail: gaps
        .map(row => {
          const owners = [isOffered(row.a) ? a.name : null, isOffered(row.b) ? b.name : null].filter(
            (owner): owner is string => owner !== null
          );
          return `No ${inSentence(row.label)}, which ${joinList(owners, "and")} ${owners.length > 1 ? "offer" : "offers"}.`;
        })
        .join(" "),
    });
  }

  const blocked = [a, b]
    .filter(product => product.features.dataImportIntoRybbit === false)
    .map(product => product.name);
  const importable = [a, b]
    .filter(product => product.features.dataImportIntoRybbit === true)
    .map(product => product.name);
  facts.push({
    term: "Switching",
    detail: (
      <>
        {importable.length > 0 && `It can import your ${joinList(importable, "and")} history. `}
        {blocked.length > 0 &&
          `It can't import ${joinList(blocked, "or")} history, so its reports start on the day you install it. `}
        Its{" "}
        <Link
          href="/docs/data-import"
          className="font-medium text-emerald-600 underline underline-offset-4 dark:text-emerald-400"
        >
          importers
        </Link>{" "}
        cover{" "}
        {joinList(
          importableCompetitors.map(product => product.name),
          "and"
        )}
        .
      </>
    ),
  });

  const pricing = rybbit.pricing;
  facts.push({
    term: "Price",
    detail: [
      `From ${pricing.startingPrice}${pricing.startingPriceIncludes ? ` for ${pricing.startingPriceIncludes}` : ""}${pricing.trial ? `, with a ${pricing.trial}` : ""}.`,
      rybbit.features.selfHostable === true
        ? `Self-hosting is free${rybbit.license ? ` (${rybbit.license})` : ""}.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  });

  return facts;
}

function PricingCard({ product }: { product: ProductEntry }) {
  const { pricing } = product;
  return (
    <article className="flex min-w-0 flex-col border-b border-neutral-200 px-5 py-10 last:border-b-0 dark:border-neutral-800 sm:px-8 md:border-b-0 md:first:border-r lg:px-10">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{pricing.model}</p>
      <h3 className="mt-2 text-xl font-semibold">{product.name}</h3>
      <p className="mt-6 text-3xl font-semibold tracking-tight">{pricing.startingPrice}</p>
      {pricing.startingPriceIncludes && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{pricing.startingPriceIncludes}</p>
      )}
      <dl className="mt-7 space-y-4 text-sm leading-6">
        <div>
          <dt className="font-medium text-neutral-900 dark:text-neutral-100">Free hosted plan</dt>
          <dd className="text-neutral-600 dark:text-neutral-300">{pricing.freeTier || "None"}</dd>
        </div>
        {pricing.trial && (
          <div>
            <dt className="font-medium text-neutral-900 dark:text-neutral-100">Trial</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">{pricing.trial}</dd>
          </div>
        )}
      </dl>
      {pricing.notes && pricing.notes.length > 0 && (
        <ul className="mt-6 space-y-3">
          {pricing.notes.map(note => (
            <li key={note} className="flex items-start gap-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
              <span className="mt-2.5 size-1 shrink-0 rounded-full bg-neutral-400" aria-hidden="true" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-auto pt-8 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        Source:{" "}
        <a
          href={pricing.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-700 underline underline-offset-4 [overflow-wrap:anywhere] hover:text-emerald-600 dark:text-neutral-300 dark:hover:text-emerald-400"
        >
          {displayUrl(pricing.sourceUrl)}
        </a>
        <br />
        Verified {formatDate(pricing.verifiedOn)}
      </p>
    </article>
  );
}

export function VsPage({ pair }: { pair: VsPair }) {
  const t = useExtracted();
  const a: ProductEntry = competitors[pair.a];
  const b: ProductEntry = competitors[pair.b];
  const showRybbit = pair.showRybbitColumn === true;
  const sections = buildTableSections(pair, a, b);
  const thirdOptionFacts = buildThirdOptionFacts(sections, a, b);
  const compareLinks = [a, b].flatMap(product =>
    product.comparePath ? [{ name: product.name, href: product.comparePath }] : []
  );
  const relatedLinks: VsLink[] = [
    ...[a, b].flatMap(product =>
      product.comparePath
        ? [
            {
              title: `Rybbit vs ${product.name}`,
              href: product.comparePath,
              description: `Our feature-by-feature comparison of Rybbit and ${product.name}`,
            },
          ]
        : []
    ),
    ...pair.relatedPosts,
  ];

  const renderValue = (value: FeatureValue) => {
    if (value === undefined) {
      return <span className="text-xs text-neutral-400 dark:text-neutral-500">Not documented</span>;
    }
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircle className="size-5 text-emerald-500" aria-label={t("Included")} />
      ) : (
        <CircleMinus className="size-5 text-neutral-400" aria-label={t("Not included")} />
      );
    }
    return (
      <span className="break-words text-xs leading-5 text-neutral-700 dark:text-neutral-300 sm:text-sm sm:leading-6">
        {value}
      </span>
    );
  };

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow={t("Comparison")}
        title={`${a.name} vs ${b.name}`}
        description={pair.intro}
        eventLocation={`compare_${pair.slug.replaceAll("-", "_")}_hero`}
        note="We make Rybbit, a competing product. Sources are linked below."
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-verdict-title">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <h2 id="vs-verdict-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Quick verdict
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Facts checked against vendor documentation on {formatDate(pair.verifiedOn)}.
            </p>
          </div>
          <div className="min-w-0 lg:col-span-8">
            <p className="border-b border-neutral-200 px-5 py-10 text-lg leading-8 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200 sm:px-8 lg:px-10">
              {pair.verdict.summary}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {[
                { product: a, verdict: pair.verdict.a },
                { product: b, verdict: pair.verdict.b },
              ].map(({ product, verdict }, index) => (
                <div
                  key={product.slug}
                  className={`px-5 py-10 sm:px-8 lg:px-10 ${index === 0 ? "border-b border-neutral-200 dark:border-neutral-800 md:border-b-0 md:border-r" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">{product.name}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">Best for {verdict.bestFor}</h3>
                  <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{verdict.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-table-title">
        <div className="mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:px-10 lg:py-16">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Feature by feature")}</p>
            <h2 id="vs-table-title" className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {a.name} and {b.name}, side by side
            </h2>
          </div>
          {/* Fixed layout with equal value columns, so both products stay on screen at phone
              widths. The optional Rybbit column only appears from md up; the third-option
              section covers Rybbit on every screen. */}
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th
                  className={`${showRybbit ? "w-[30%] md:w-[28%]" : "w-[30%] md:w-2/5"} px-4 py-5 text-left font-medium text-neutral-500 sm:px-6 lg:px-10`}
                >
                  {t("Capability")}
                </th>
                <th className="border-l border-neutral-200 px-3 py-5 text-center font-semibold dark:border-neutral-800 sm:px-6">
                  {a.name}
                </th>
                <th className="border-l border-neutral-200 px-3 py-5 text-center font-semibold dark:border-neutral-800 sm:px-6">
                  {b.name}
                </th>
                {showRybbit && (
                  <th className="hidden border-l border-neutral-200 px-6 py-5 text-center font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 md:table-cell">
                    Rybbit (our product)
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <React.Fragment key={section.group}>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
                    {/* Span only the always-visible columns: a colSpan over the hidden Rybbit
                        column would keep an empty column on mobile. */}
                    <th
                      colSpan={3}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 sm:px-6 lg:px-10"
                    >
                      {section.title}
                    </th>
                    {showRybbit && <td className="hidden md:table-cell" />}
                  </tr>
                  {section.rows.map(row => (
                    <tr
                      key={`${section.group}-${row.key}`}
                      className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800"
                    >
                      <th
                        scope="row"
                        className="px-4 py-4 text-left font-medium text-neutral-700 dark:text-neutral-300 sm:px-6 lg:px-10"
                      >
                        {row.label}
                      </th>
                      <td className="border-l border-neutral-200 px-3 py-4 text-center dark:border-neutral-800 sm:px-6">
                        <div className="flex justify-center">{renderValue(row.a)}</div>
                      </td>
                      <td className="border-l border-neutral-200 px-3 py-4 text-center dark:border-neutral-800 sm:px-6">
                        <div className="flex justify-center">{renderValue(row.b)}</div>
                      </td>
                      {showRybbit && (
                        <td className="hidden border-l border-neutral-200 px-6 py-4 text-center dark:border-neutral-800 md:table-cell">
                          <div className="flex justify-center">{renderValue(row.rybbit)}</div>
                        </td>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {pair.tableNotes && pair.tableNotes.length > 0 && (
            <div className="space-y-2 border-t border-neutral-200 px-5 py-6 text-xs leading-5 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:px-8 lg:px-10">
              {pair.tableNotes.map(note => (
                <p key={note} className="max-w-3xl">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-pricing-title">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Pricing")}</p>
            <h2 id="vs-pricing-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {t("Pricing comparison")}
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Prices change. Each card links to the vendor page it was checked against.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 lg:col-span-8 md:grid-cols-2">
            <PricingCard product={a} />
            <PricingCard product={b} />
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-fit-title">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Comparison")}</p>
            <h2 id="vs-fit-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {t("Which is right for you?")}
            </h2>
          </div>
          <div className="grid min-w-0 grid-cols-1 lg:col-span-8 md:grid-cols-2">
            {[
              { product: a, items: pair.chooseA },
              { product: b, items: pair.chooseB },
            ].map(({ product, items }, index) => (
              <div
                key={product.slug}
                className={`px-5 py-10 sm:px-8 lg:px-10 ${index === 0 ? "border-b border-neutral-200 dark:border-neutral-800 md:border-b-0 md:border-r" : ""}`}
              >
                <h3 className="text-lg font-semibold">
                  {t("Choose {competitor} if...", { competitor: product.name })}
                </h3>
                <ul className="mt-6 space-y-4">
                  {items.map(item => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300"
                    >
                      <CheckCircle className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-third-option-title">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <h2 id="vs-third-option-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Considering a third option?
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Rybbit is our product, so weigh this section accordingly.
            </p>
          </div>
          <div className="min-w-0 px-5 py-12 sm:px-8 lg:col-span-8 lg:px-10 lg:py-16">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
              {thirdOptionFacts.map(fact => (
                <React.Fragment key={fact.term}>
                  <dt className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{fact.term}</dt>
                  <dd className="-mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300 sm:mt-0">
                    {fact.detail}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
            {compareLinks.length > 0 && (
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {compareLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900"
                  >
                    Rybbit vs {link.name}
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-faq-title">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("FAQ")}</p>
            <h2 id="vs-faq-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {t("Frequently asked questions")}
            </h2>
          </div>
          {/* Native <details> keeps every answer in the HTML (Radix accordions drop closed
              panels), so the visible FAQ always matches the FAQPage JSON-LD. */}
          <div className="min-w-0 lg:col-span-8">
            {pair.faq.map(item => (
              <details
                key={item.question}
                className="group border-b border-neutral-300/50 last:border-b-0 dark:border-neutral-800/50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left text-base font-medium transition-colors hover:text-emerald-500 sm:px-8 lg:px-10 dark:hover:text-emerald-400 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown
                    className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-5 pb-6 text-sm leading-6 text-neutral-700 dark:text-neutral-300 sm:px-8 lg:px-10">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-sources-title">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <h2 id="vs-sources-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Sources
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Every claim about {a.name} and {b.name} on this page comes from these pages, checked on{" "}
              {formatDate(pair.verifiedOn)}. If a vendor has changed something since, its page is the final word.
            </p>
          </div>
          <ul className="min-w-0 gap-10 px-5 py-12 sm:px-8 md:columns-2 lg:col-span-8 lg:px-10 lg:py-16">
            {pair.sources.map(source => (
              <li key={source.url} className="mb-5 break-inside-avoid">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                >
                  <span className="font-medium text-neutral-800 underline-offset-4 group-hover:text-emerald-600 group-hover:underline dark:text-neutral-200 dark:group-hover:text-emerald-400">
                    {source.label}
                  </span>
                  <span className="block text-xs text-neutral-500 [overflow-wrap:anywhere] dark:text-neutral-400">
                    {displayUrl(source.url)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {relatedLinks.length > 0 && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="vs-related-title">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Resources")}</p>
              <h2 id="vs-related-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("Related resources")}
              </h2>
            </div>
            <div className="min-w-0 lg:col-span-8">
              {relatedLinks.map(resource => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className="group grid border-b border-neutral-200 px-5 py-7 last:border-b-0 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
                >
                  <span className="font-semibold">{resource.title}</span>
                  <span className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400 sm:mt-0">
                    {resource.description}
                  </span>
                  <ArrowRight
                    className="mt-4 size-4 text-neutral-400 transition-transform group-hover:translate-x-1 sm:mt-0"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTASection eventLocation="vs_comparison_bottom_cta" />
    </div>
  );
}
