import { Check, Download, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Brand Kit",
  description:
    "Download official Rybbit logos and brand assets for use in your projects",
  openGraph: {
    images: [createOGImageUrl("Brand Kit", "Download official Rybbit logos and brand assets for use in your projects")],
  },
  twitter: {
    images: [createOGImageUrl("Brand Kit", "Download official Rybbit logos and brand assets for use in your projects")],
  },
});

type Variant = {
  name: string;
  file: string;
  bg: "light" | "dark";
};

type LogoSection = {
  title: string;
  type: string;
  variants: Variant[];
};

function LogoCard({ variant, svgLabel, pngLabel }: { variant: Variant; svgLabel: string; pngLabel: string }) {
  const pngPath = `/rybbit/${variant.file}.png`;
  const svgPath = `/rybbit/${variant.file}.svg`;

  return (
    <div className="bg-white dark:bg-neutral-950">
      <div
        className={`flex h-44 items-center justify-center border-b border-neutral-200 p-8 dark:border-neutral-800 ${
          variant.bg === "dark" ? "bg-neutral-900" : "bg-neutral-100"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pngPath} alt={`Rybbit ${variant.name} logo`} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <p className="text-sm font-medium text-neutral-950 dark:text-neutral-50">{variant.name}</p>
        <div className="flex gap-2">
          <a
            href={svgPath}
            download
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
          >
            <Download className="size-3" aria-hidden="true" />
            {svgLabel}
          </a>
          <a
            href={pngPath}
            download
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
          >
            <Download className="size-3" aria-hidden="true" />
            {pngLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function BrandKit() {
  const t = useExtracted();

  const svgLabel = t("SVG");
  const pngLabel = t("PNG");

  const SECTIONS: LogoSection[] = [
    {
      title: t("Horizontal"),
      type: "horizontal",
      variants: [
        { name: t("Default"), file: "horizontal", bg: "light" },
        { name: t("For Dark BG"), file: "horizontal_for dark BG", bg: "dark" },
        { name: t("Light Green"), file: "horizontal_light green", bg: "dark" },
        { name: t("Dark Green"), file: "horizontal_dark green", bg: "light" },
        { name: t("White"), file: "horizontal_white", bg: "dark" },
        { name: t("Black"), file: "horizontal_black", bg: "light" },
      ],
    },
    {
      title: t("Vertical"),
      type: "vertical",
      variants: [
        { name: t("Default"), file: "vertical", bg: "light" },
        { name: t("For Dark BG"), file: "vertical_for dark BG", bg: "dark" },
        { name: t("Light Green"), file: "vertical_light green", bg: "dark" },
        { name: t("Dark Green"), file: "vertical_dark green", bg: "light" },
        { name: t("White"), file: "vertical_white", bg: "dark" },
        { name: t("Black"), file: "vertical_black", bg: "light" },
      ],
    },
    {
      title: t("Frog Icon"),
      type: "frog",
      variants: [
        { name: t("Light Green"), file: "frog_light green", bg: "dark" },
        { name: t("Dark Green"), file: "frog_dark green", bg: "light" },
        { name: t("White"), file: "frog_white", bg: "dark" },
        { name: t("Black"), file: "frog_black", bg: "light" },
      ],
    },
    {
      title: t("Wordmark"),
      type: "type",
      variants: [
        { name: t("Dark Green"), file: "type_dark green", bg: "light" },
        { name: t("Light Green"), file: "type_light green", bg: "dark" },
        { name: t("White"), file: "type_white", bg: "dark" },
        { name: t("Black"), file: "type_black", bg: "light" },
      ],
    },
  ];

  const doItems = [
    t("Use the logo in its original proportions"),
    t('Use the "For Dark BG" variants on dark backgrounds'),
    t("Maintain clear space around the logo"),
    t("Use SVG format when possible for best quality"),
  ];

  const dontItems = [
    t("Stretch or distort the logo"),
    t("Change the logo colors beyond provided variants"),
    t("Add effects like shadows or gradients to the logo"),
    t("Use the logo in a way that implies endorsement"),
  ];

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        title={t("Brand Kit")}
        description={t(
          "Download official Rybbit logos and assets. All logos are available in SVG and PNG formats for use in your projects, integrations, and content."
        )}
        eventLocation="brand_hero"
        primaryAction={null}
        secondaryAction={null}
        note={null}
      />

      {SECTIONS.map(section => (
        <section
          key={section.type}
          className="border-b border-neutral-200 dark:border-neutral-800"
          aria-labelledby={`brand-${section.type}`}
        >
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-14">
              <div className="lg:sticky lg:top-24">
                <h2
                  id={`brand-${section.type}`}
                  className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 md:text-3xl"
                >
                  {section.title}
                </h2>
              </div>
            </div>
            <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-2 lg:col-span-8">
              {section.variants.map(variant => (
                <LogoCard key={variant.file} variant={variant} svgLabel={svgLabel} pngLabel={pngLabel} />
              ))}
              {section.variants.length % 2 === 1 && (
                <div aria-hidden="true" className="hidden bg-white dark:bg-neutral-950 sm:block" />
              )}
            </div>
          </div>
        </section>
      ))}

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="brand-guidelines">
        <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-14">
            <div className="lg:sticky lg:top-24">
              <h2
                id="brand-guidelines"
                className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 md:text-3xl"
              >
                {t("Usage Guidelines")}
              </h2>
            </div>
          </div>
          <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 lg:col-span-8 md:grid-cols-2">
            <div className="bg-white px-5 py-9 dark:bg-neutral-950 sm:px-8 lg:px-10">
              <h3 className="flex items-center gap-2 font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
                <Check className="size-4" aria-hidden="true" />
                {t("Do")}
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {doItems.map(item => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white px-5 py-9 dark:bg-neutral-950 sm:px-8 lg:px-10">
              <h3 className="flex items-center gap-2 font-semibold tracking-tight text-neutral-700 dark:text-neutral-300">
                <X className="size-4" aria-hidden="true" />
                {t("Don't")}
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {dontItems.map(item => (
                  <li key={item} className="flex gap-2.5">
                    <X className="mt-0.5 size-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
