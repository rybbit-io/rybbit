"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_OPTIONS = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "zh", label: "简体中文", flag: "🇨🇳" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
] as const satisfies { value: (typeof routing.locales)[number]; label: string; flag: string }[];

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleLocaleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.replace(pathname, { locale: e.target.value });
  }

  return (
    <select
      value={currentLocale}
      onChange={handleLocaleChange}
      className="bg-transparent text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-400"
      aria-label="Select language"
    >
      {LOCALE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.flag} {option.label}
        </option>
      ))}
    </select>
  );
}
