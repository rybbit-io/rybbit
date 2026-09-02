import { TrackedButton } from "@/components/TrackedButton";
import { cn } from "@/lib/utils";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

/** The B register: a 1280px column, hairlines, 16px panels, pill buttons. */
export const CONTAINER = "mx-auto w-full max-w-[1280px] px-5 sm:px-8";

const pillBase =
  "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950";
export const pillPrimary = cn(pillBase, "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500");
export const pillNeutral = cn(
  pillBase,
  "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
);
export const pillSmall = "min-h-10 px-4 text-sm";

export function SignupButton({ location, label, className }: { location: string; label: string; className?: string }) {
  return (
    <TrackedButton
      href="https://app.rybbit.io/signup"
      eventName="signup"
      eventProps={{ location, button_text: label }}
      className={cn(pillPrimary, className)}
    >
      {label}
      <ArrowRight
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </TrackedButton>
  );
}

export function DemoButton({ location, label, className }: { location: string; label: string; className?: string }) {
  return (
    <TrackedButton
      href="https://demo.rybbit.com/81"
      eventName="demo"
      target="_blank"
      rel="noopener noreferrer"
      eventProps={{ location, button_text: label }}
      className={cn(pillNeutral, className)}
    >
      {label}
      <ExternalLink
        className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </TrackedButton>
  );
}

export function TextLink({ href, children, muted = false }: { href: string; children: React.ReactNode; muted?: boolean }) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex w-max items-center gap-1.5 border-b pb-0.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        muted
          ? "border-neutral-300 text-neutral-600 hover:text-neutral-950 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-white"
          : "border-neutral-300 text-neutral-950 hover:border-neutral-950 dark:border-neutral-700 dark:text-white dark:hover:border-white"
      )}
    >
      {children}
      <ArrowRight
        className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}

/** One of the alternating feature panels: copy on one side, a live visual on the other. */
export function Panel({
  children,
  className,
  visualFirst = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Put the visual in the first column on large screens (copy stays first on mobile). */
  visualFirst?: boolean;
}) {
  return (
    <section
      className={cn(
        "grid gap-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-[#131313] sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:p-14",
        visualFirst && "lg:grid-cols-[1.2fr_1fr] [&>*:first-child]:lg:order-2",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelCopy({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-col justify-center gap-5">
      <h2 className="max-w-[16ch] text-[28px] font-medium leading-[1.15] tracking-[-0.03em] md:text-[34px] text-balance">
        {title}
      </h2>
      <p className="max-w-[44ch] text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {links.map((link, index) => (
            <TextLink key={link.href} href={link.href} muted={index > 0}>
              {link.label}
            </TextLink>
          ))}
        </div>
      )}
    </div>
  );
}

/** Product-window frame for the visuals: slim mono header, panel surface. */
export function Frame({
  label,
  right,
  children,
  className,
}: {
  label?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#0f0f0f]",
        className
      )}
    >
      {(label || right) && (
        <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800">
          {label && <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{label}</span>}
          {right && (
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">{right}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  aside,
  id,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
      <div className="flex flex-col gap-3">
        <h2 id={id} className="text-[30px] font-medium leading-[1.1] tracking-[-0.03em] md:text-[36px] text-balance">
          {title}
        </h2>
        {description && (
          <p className="max-w-[60ch] text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {aside}
    </div>
  );
}
