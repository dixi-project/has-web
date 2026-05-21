import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Props = {
  locale: string;
};

export async function SiteHeader({ locale }: Props) {
  const t = await getTranslations("Nav");
  const tSite = await getTranslations("Site");

  const navLinks = [
    { href: `/${locale}/#mission`, label: t("mission") },
    { href: `/${locale}/#system`, label: t("system") },
    { href: `/${locale}/#disciplines`, label: t("disciplines") },
    { href: `/${locale}/#roles`, label: t("roles") },
    { href: `/${locale}/simulator/`, label: t("simulator") },
    { href: `/${locale}/#roadmap`, label: t("roadmap") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <a
          href={`/${locale}/`}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="bg-foreground text-background inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
          >
            H
          </span>
          <span className="hidden sm:inline">{tSite("name")}</span>
          <span className="sm:hidden">{tSite("shortName")}</span>
          <span
            aria-hidden
            className="ml-1 hidden rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-800 sm:inline-block dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {tSite("slogan")}
          </span>
        </a>

        <nav className="hidden items-center gap-5 text-sm lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <LanguageSwitcher locale={locale} variant="header" />
          <a
            href={`https://admin.haslife.org/${locale}/login`}
            className="bg-foreground text-background inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold hover:opacity-90"
          >
            {t("signIn")}
          </a>
        </div>
      </div>
    </header>
  );
}
