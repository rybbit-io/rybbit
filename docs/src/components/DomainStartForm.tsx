"use client";

import { appendReferral } from "@/lib/rewardful";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

const DOMAIN_PATTERN = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,}$/u;

export function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

interface DomainStartFormProps {
  /** Where on the page the form sits; sent with the analytics event. */
  location: string;
  /** "hero" sits on the page ground; "inverted" sits on the emerald CTA band. */
  variant?: "hero" | "inverted";
  buttonText?: string;
  className?: string;
}

/**
 * Replaces the signup button: the visitor types a domain and lands on a live
 * dashboard for it (app.rybbit.io/try creates the site, no account needed).
 */
export function DomainStartForm({ location, variant = "hero", buttonText, className = "" }: DomainStartFormProps) {
  const t = useExtracted();
  const [domain, setDomain] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inverted = variant === "inverted";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized = normalizeDomain(domain);
    if (!DOMAIN_PATTERN.test(normalized)) {
      setInvalid(true);
      return;
    }
    window.rybbit?.event?.("signup", { location, method: "domain_input" });
    const href = `https://app.rybbit.io/try?domain=${encodeURIComponent(normalized)}`;
    window.location.href = appendReferral(href);
  };

  const inputId = `domain-start-${location}`;

  return (
    <form onSubmit={onSubmit} className={`flex w-full max-w-md flex-col gap-2 ${className}`} noValidate>
      <label htmlFor={inputId} className="sr-only">
        {t("Your website domain")}
      </label>
      <div
        className={
          inverted
            ? "flex min-h-11 flex-col items-stretch overflow-hidden rounded-md border border-white/25 bg-white/10 transition-colors focus-within:border-white/60 focus-within:ring-2 focus-within:ring-white/40"
            : "flex min-h-11 flex-col items-stretch overflow-hidden rounded-md border border-neutral-300 sm:flex-row bg-white transition-colors focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-emerald-500/40 dark:border-neutral-700 dark:bg-neutral-950 dark:focus-within:border-neutral-500"
        }
      >
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t("yourdomain.com")}
          value={domain}
          onChange={e => {
            setDomain(e.target.value);
            if (invalid) setInvalid(false);
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${inputId}-error` : undefined}
          className={
            inverted
              ? "min-h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-white placeholder:text-emerald-100/50 focus:outline-none"
              : "min-h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none dark:text-white dark:placeholder:text-neutral-500"
          }
        />
        <button
          type="submit"
          className={
            inverted
              ? "group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-white px-4 text-sm font-medium text-emerald-950 transition-colors duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
              : "group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-emerald-600 px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
          }
        >
          {buttonText ?? t("See my dashboard")}
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </button>
      </div>
      {invalid && (
        <p
          id={`${inputId}-error`}
          className={inverted ? "text-xs text-emerald-100/80" : "text-xs text-red-600 dark:text-red-400"}
        >
          {t("Enter a domain like example.com")}
        </p>
      )}
    </form>
  );
}
