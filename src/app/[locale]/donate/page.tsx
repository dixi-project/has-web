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
  const t = await getTranslations({ locale, namespace: "DonatePage" });
  const tPause = await getTranslations({
    locale,
    namespace: "DonatePage.pause",
  });

  const languages: Record<string, string> = {
    "x-default": "/en/donate/",
  };
  for (const l of routing.locales) {
    languages[l] = `/${l}/donate/`;
  }

  return {
    title: t("metaTitle"),
    description: tPause("subtitle"),
    alternates: {
      canonical: `/${locale}/donate/`,
      languages,
    },
    robots: { index: false, follow: true },
    openGraph: {
      title: t("metaTitle"),
      description: tPause("subtitle"),
      locale,
      alternateLocale: routing.locales.filter((l) => l !== locale),
      type: "website",
    },
  };
}

export default async function DonatePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("DonatePage.pause");
  const tCommon = await getTranslations("PageCommon");

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

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-widest text-amber-900 uppercase dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <span aria-hidden>●</span>
              {t("eyebrow")}
            </div>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("title")}
            </h1>

            <p className="mt-6 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              {t("subtitle")}
            </p>

            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-sm leading-6 text-zinc-700 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-zinc-300">
              {t("legal")}
            </p>
          </div>
        </section>

        <section className="border-t border-black/5 py-16 dark:border-white/10">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-6 md:grid-cols-2">
              <article className="rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-zinc-950">
                <h2 className="text-xl font-semibold">{t("citizensTitle")}</h2>
                <a
                  href={`https://admin.haslife.org/${locale}/signup?as=citizen`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-sky-700 px-5 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  {t("citizensCta")}
                </a>
              </article>

              <article className="rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-zinc-950">
                <h2 className="text-xl font-semibold">
                  {t("collaboratorsTitle")}
                </h2>
                <a
                  href={`https://admin.haslife.org/${locale}/signup?as=collaborator`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  {t("collaboratorsCta")}
                </a>
              </article>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
