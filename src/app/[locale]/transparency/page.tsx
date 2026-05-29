import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "TransparencyPage" });

  const languages: Record<string, string> = {
    "x-default": "/en/transparency/",
  };
  for (const l of routing.locales) {
    languages[l] = `/${l}/transparency/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/transparency/`,
      languages,
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      locale,
      alternateLocale: routing.locales.filter((l) => l !== locale),
      type: "article",
    },
  };
}

export default async function TransparencyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("TransparencyPage");
  const tCommon = await getTranslations("PageCommon");

  // Bloques con CTA explícito (datos reales o link a evidencia pública).
  const principles = [
    t("principles.openSource"),
    t("principles.openData"),
    t("principles.openProcess"),
    t("principles.openFinance"),
  ];

  const infraRows = [
    {
      label: t("infra.hostingLabel"),
      value: t("infra.hostingValue"),
    },
    {
      label: t("infra.budgetLabel"),
      value: t("infra.budgetValue"),
    },
    {
      label: t("infra.deployLabel"),
      value: t("infra.deployValue"),
    },
    {
      label: t("infra.encryptionLabel"),
      value: t("infra.encryptionValue"),
    },
  ];

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-50 via-white to-white dark:from-amber-950/30 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="mx-auto max-w-3xl px-6 pt-16 pb-12 sm:pt-24">
            <a
              href={`/${locale}/`}
              className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400"
            >
              {tCommon("back")}
            </a>
            <p className="mt-6 text-xs font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-400">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              {t("subtitle")}
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-3xl space-y-12 px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("principles.title")}
              </h2>
              <ul className="mt-4 space-y-2 text-zinc-700 dark:text-zinc-300">
                {principles.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("donations.title")}
              </h2>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">{t("donations.statusLabel")}</p>
                <p className="mt-1">{t("donations.statusValue")}</p>
              </div>
              <p className="mt-4 text-zinc-700 dark:text-zinc-300">
                {t("donations.body")}
              </p>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {t.rich("donations.evidence", {
                  adr: (chunks) => (
                    <a
                      href="https://github.com/dixi-project/sys_has/blob/main/09-architecture/adr/ADR-020-pause-donations-pending-legal-entity.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("legal.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("legal.body")}
              </p>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {t.rich("legal.evidence", {
                  adr009: (chunks) => (
                    <a
                      href="https://github.com/dixi-project/sys_has/blob/main/09-architecture/adr/ADR-009-legal-entity-strategy.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {chunks}
                    </a>
                  ),
                  privacyOfficer: (chunks) => (
                    <a
                      href="https://github.com/dixi-project/sys_has/blob/main/13-security/privacy-officer.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("infra.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("infra.intro")}
              </p>
              <dl className="mt-4 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {infraRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-3 gap-3 px-4 py-3 text-sm"
                  >
                    <dt className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {row.label}
                    </dt>
                    <dd className="col-span-2 text-zinc-600 dark:text-zinc-400">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("verify.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("verify.intro")}
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {t("verify.repoLabel")}
                  </p>
                  <a
                    href="https://github.com/dixi-project"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-mono text-xs text-amber-700 hover:underline dark:text-amber-400"
                  >
                    github.com/dixi-project
                  </a>
                </li>
                <li className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {t("verify.specsLabel")}
                  </p>
                  <a
                    href="https://github.com/dixi-project/sys_has"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-mono text-xs text-amber-700 hover:underline dark:text-amber-400"
                  >
                    github.com/dixi-project/sys_has
                  </a>
                </li>
                <li className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {t("verify.contactLabel")}
                  </p>
                  <a
                    href={`/${locale}/contact/`}
                    className="mt-1 inline-block text-xs text-amber-700 hover:underline dark:text-amber-400"
                  >
                    {t("verify.contactCta")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs text-zinc-500">
                {t("updatedAt", { date: "2026-05-29" })}
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
