import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested page does not exist. Use the Rybbit sitemap, documentation, or agent index to continue.",
  robots: { index: false, follow: true },
};

const recoveryLinks = [
  { href: "/docs", label: "Documentation" },
  { href: "/sitemap.xml", label: "Sitemap" },
  { href: "/llms.txt", label: "Agent index" },
  { href: "/openapi.json", label: "API specification" },
];

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="w-full max-w-2xl border-y border-neutral-200 py-12 dark:border-neutral-800 sm:py-16">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">Page not found</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
          The requested path does not exist on Rybbit. Try the documentation or use one of the machine-readable indexes
          below to find the right page.
        </p>
        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3" aria-label="404 recovery links">
          {recoveryLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:decoration-emerald-800 dark:hover:text-emerald-300"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          href="/"
          className="mt-10 inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
