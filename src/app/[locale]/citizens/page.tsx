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
  const t = await getTranslations({ locale, namespace: "CitizensPage" });
  const tHero = await getTranslations({
    locale,
    namespace: "CitizensPage.hero",
  });

  const languages: Record<string, string> = {
    "x-default": "/en/citizens/",
  };
  for (const l of routing.locales) {
    languages[l] = `/${l}/citizens/`;
  }

  return {
    title: t("metaTitle"),
    description: tHero("subtitle"),
    alternates: {
      canonical: `/${locale}/citizens/`,
      languages,
    },
    openGraph: {
      title: t("metaTitle"),
      description: tHero("subtitle"),
      locale,
      alternateLocale: routing.locales.filter((l) => l !== locale),
      type: "website",
    },
  };
}

export default async function CitizensPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("CitizensPage");
  const tCommon = await getTranslations("PageCommon");

  const whatItems = t.raw("what.items") as string[];
  const benefits = t.raw("benefits.items") as Array<{
    title: string;
    description: string;
  }>;
  const privacyItems = t.raw("privacy.items") as string[];
  const faqs = t.raw("faq.items") as Array<{ q: string; a: string }>;

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-white to-white dark:from-sky-950/30 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-24">
            <a
              href={`/${locale}/`}
              className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400"
            >
              {tCommon("back")}
            </a>
            <p className="mt-6 text-xs font-semibold tracking-widest text-sky-700 uppercase dark:text-sky-400">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:waitlist@humanagingsimulators.org?subject=HAS%20citizens%20waitlist"
                className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:opacity-90"
              >
                {t("hero.ctaPrimary")}
              </a>
              <a
                href="#privacy"
                className="inline-flex h-12 items-center justify-center rounded-full border border-current px-6 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>
          </div>
        </section>

        {/* WHAT */}
        <section className="border-t border-black/5 py-20 dark:border-white/10">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {t("what.title")}
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {whatItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 rounded-2xl border border-black/5 bg-white p-5 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-sky-500"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="border-t border-black/5 bg-zinc-50 py-20 dark:border-white/10 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {t("benefits.title")}
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
                >
                  <h3 className="text-base font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {b.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRIVACY */}
        <section
          id="privacy"
          className="border-t border-black/5 py-20 dark:border-white/10"
        >
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {t("privacy.title")}
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {privacyItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 rounded-2xl border border-black/5 bg-white p-5 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-sky-500"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-black/5 bg-zinc-50 py-20 dark:border-white/10 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {t("faq.title")}
            </h2>
            <dl className="mt-8 space-y-6">
              {faqs.map((f, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
                >
                  <dt className="font-semibold">{f.q}</dt>
                  <dd className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA BLOCK */}
        <section className="border-t border-black/5 py-20 dark:border-white/10">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {t("ctaBlock.title")}
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {t("ctaBlock.subtitle")}
            </p>
            <a
              href="mailto:waitlist@humanagingsimulators.org?subject=HAS%20citizens%20waitlist"
              className="bg-foreground text-background mt-8 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:opacity-90"
            >
              {t("ctaBlock.ctaLabel")}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
