"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CountryFlag } from "./CountryFlag";

const LOCALE_OPTIONS = [
  { value: "en", label: "English", country: "US" },
  { value: "de", label: "Deutsch", country: "DE" },
  { value: "fr", label: "Français", country: "FR" },
  { value: "zh", label: "简体中文", country: "CN" },
  { value: "es", label: "Español", country: "ES" },
  { value: "pl", label: "Polski", country: "PL" },
  { value: "it", label: "Italiano", country: "IT" },
  { value: "ko", label: "한국어", country: "KR" },
  { value: "pt", label: "Português", country: "BR" },
  { value: "ja", label: "日本語", country: "JP" },
] as const satisfies {
  value: (typeof routing.locales)[number];
  label: string;
  country: string;
}[];

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALE_OPTIONS.find((o) => o.value === currentLocale) ?? LOCALE_OPTIONS[0];

  function handleLocaleChange(locale: string) {
    router.replace(pathname, { locale });
    setOpen(false);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-transparent text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-400"
        aria-label="Select language"
      >
        <CountryFlag country={current.country} className="w-4" />
        {current.label}
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[160px] rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1">
          {LOCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleLocaleChange(option.value)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                option.value === currentLocale
                  ? "text-neutral-900 dark:text-white font-medium"
                  : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <CountryFlag country={option.country} className="w-4" />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
