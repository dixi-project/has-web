import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SimulatorDemo } from "@/components/SimulatorDemo";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Simulator" });

  const languages: Record<string, string> = { "x-default": "/en/simulator/" };
  for (const l of routing.locales) {
    languages[l] = `/${l}/simulator/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/simulator/`,
      languages,
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      locale,
      alternateLocale: routing.locales.filter((l) => l !== locale),
      type: "website",
    },
  };
}

export default async function SimulatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Simulator");
  const tCommon = await getTranslations("PageCommon");

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="mx-auto max-w-3xl px-6 pt-16 pb-12 sm:pt-24">
            <a
              href={`/${locale}/`}
              className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {tCommon("back")}
            </a>
            <p className="mt-6 text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
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

        {/* Qué es el motor */}
        <section className="pb-4">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("intro.heading")}
            </h2>
            <p className="mt-4 leading-8 text-zinc-700 dark:text-zinc-300">
              {t("intro.body")}
            </p>
          </div>
        </section>

        {/* Demo interactiva */}
        <section className="py-12">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("demo.title")}
            </h2>
            <p className="mt-4 mb-8 max-w-2xl leading-8 text-zinc-700 dark:text-zinc-300">
              {t("demo.intro")}
            </p>
            <SimulatorDemo />
          </div>
        </section>

        {/* Cómo funciona el modelo */}
        <section className="pb-6">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("model.heading")}
            </h2>
            <p className="mt-4 leading-8 text-zinc-700 dark:text-zinc-300">
              {t("model.body")}
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="pb-12">
          <div className="mx-auto max-w-3xl px-6">
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {t("disclaimer")}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-6">
            <div className="rounded-2xl bg-emerald-700 px-8 py-10 text-center dark:bg-emerald-800">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {t("cta.heading")}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-emerald-50">
                {t("cta.body")}
              </p>
              <a
                href={`/${locale}/citizens/`}
                className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                {t("cta.button")}
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
