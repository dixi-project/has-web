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
  const t = await getTranslations({ locale, namespace: "ThanksPage" });

  const languages: Record<string, string> = { "x-default": "/en/thanks/" };
  for (const l of routing.locales) {
    languages[l] = `/${l}/thanks/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}/thanks/`,
      languages,
    },
  };
}

export default async function ThanksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ThanksPage");

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="mx-auto max-w-3xl px-6 pt-24 pb-20 text-center sm:pt-32">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              {t("message")}
            </p>
            <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
              {t("receiptNote")}
            </p>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={`/${locale}/`}
                className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:opacity-90"
              >
                {t("backHome")}
              </a>
              <a
                href={`/${locale}/donate/#transparency`}
                className="inline-flex h-12 items-center justify-center rounded-full border border-current px-6 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
              >
                {t("seeImpact")}
              </a>
            </div>

            <p className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-6 py-4 text-sm leading-6 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              {t("recurringNote")}
            </p>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
