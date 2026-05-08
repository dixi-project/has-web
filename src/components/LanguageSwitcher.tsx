import { routing, localeLabels } from "@/i18n/routing";

type Props = {
  locale: string;
  variant?: "header" | "footer";
};

const codeOnly: Record<(typeof routing.locales)[number], string> = {
  es: "ES",
  en: "EN",
  pt: "PT",
  fr: "FR",
  it: "IT",
  de: "DE",
  ru: "RU",
  ja: "JA",
  zh: "ZH",
  hi: "HI",
  ar: "AR",
};

// Server-rendered dropdown built on <details>/<summary> — no client JS needed.
export function LanguageSwitcher({ locale, variant = "header" }: Props) {
  const isHeader = variant === "header";
  const currentLabel = localeLabels[locale as keyof typeof localeLabels];
  const currentCode = codeOnly[locale as keyof typeof codeOnly];

  return (
    <details className={`group relative ${isHeader ? "" : "inline-block"}`}>
      <summary
        aria-label={`Idioma: ${currentLabel}`}
        className={
          isHeader
            ? "flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 [&::-webkit-details-marker]:hidden"
            : "flex cursor-pointer list-none items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 [&::-webkit-details-marker]:hidden"
        }
      >
        <span aria-hidden>🌐</span>
        <span>{isHeader ? currentCode : currentLabel}</span>
        <svg
          aria-hidden
          className="h-3 w-3 transition-transform group-open:rotate-180"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <ul
        role="menu"
        className={`absolute z-50 mt-2 max-h-80 w-44 overflow-auto rounded-2xl border border-black/5 bg-white py-2 shadow-lg dark:border-white/10 dark:bg-zinc-900 ${
          isHeader ? "right-0" : "bottom-full left-0 mb-2"
        }`}
      >
        {routing.locales.map((l) => {
          const isCurrent = l === locale;
          return (
            <li key={l} role="none">
              <a
                role="menuitem"
                href={`/${l}/`}
                lang={l}
                aria-current={isCurrent ? "true" : undefined}
                className={
                  isCurrent
                    ? "flex items-center justify-between gap-3 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "flex items-center justify-between gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }
              >
                <span>{localeLabels[l]}</span>
                <span className="text-xs text-zinc-400">{codeOnly[l]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
