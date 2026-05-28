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
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });

  const languages: Record<string, string> = { "x-default": "/en/privacy/" };
  for (const l of routing.locales) {
    languages[l] = `/${l}/privacy/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/privacy/`,
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

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PrivacyPage");
  const tCommon = await getTranslations("PageCommon");

  const tldr = [
    t("tldr.collect"),
    t("tldr.why"),
    t("tldr.access"),
    t("tldr.donors"),
    t("tldr.collaborators"),
    t("tldr.encryption"),
    t("tldr.minAge"),
  ];

  const rights = [
    t("rights.access"),
    t("rights.rectification"),
    t("rights.erasure"),
    t("rights.portability"),
    t("rights.objection"),
    t("rights.accounting"),
  ];

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-white to-white dark:from-sky-950/30 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="mx-auto max-w-3xl px-6 pt-16 pb-12 sm:pt-24">
            <a
              href={`/${locale}/`}
              className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400"
            >
              {tCommon("back")}
            </a>
            <p className="mt-6 text-xs font-semibold tracking-widest text-sky-700 uppercase dark:text-sky-400">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              {t("subtitle")}
            </p>
            <p className="mt-4 text-xs text-zinc-500">{t("draftNotice")}</p>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-3xl space-y-12 px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("tldr.title")}
              </h2>
              <ul className="mt-4 space-y-2 text-zinc-700 dark:text-zinc-300">
                {tldr.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("rights.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("rights.intro")}
              </p>
              <ul className="mt-4 space-y-2 text-zinc-700 dark:text-zinc-300">
                {rights.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                {t.rich("rights.dsrLink", {
                  link: (chunks) => (
                    <a
                      href="https://admin.haslife.org/"
                      className="font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("contact.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t.rich("contact.body", {
                  mail: (chunks) => (
                    <a
                      href="mailto:privacy@haslife.org"
                      className="font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      {chunks}
                    </a>
                  ),
                  form: (chunks) => (
                    <a
                      href={`/${locale}/contact/`}
                      className="font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("full.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t.rich("full.body", {
                  link: (chunks) => (
                    <a
                      href="https://github.com/dixi-project/sys_has/blob/main/10-engineering/legal/privacy-policy.es.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">
                {t("version", { version: "0.1-draft", date: "2026-05-19" })}
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
