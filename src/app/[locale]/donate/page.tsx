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
  const tHero = await getTranslations({ locale, namespace: "DonatePage.hero" });

  const languages: Record<string, string> = { "x-default": "/en/donate/" };
  for (const l of routing.locales) {
    languages[l] = `/${l}/donate/`;
  }

  return {
    title: t("metaTitle"),
    description: tHero("subtitle"),
    alternates: {
      canonical: `/${locale}/donate/`,
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

export default async function DonatePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("DonatePage");
  const tCommon = await getTranslations("PageCommon");

  const whatItems = t.raw("what.items") as string[];
  const benefits = t.raw("benefits.items") as Array<{
    title: string;
    description: string;
  }>;
  const tiers = t.raw("tiers.items") as Array<{
    name: string;
    amount: string;
    description: string;
  }>;
  const faqs = t.raw("faq.items") as Array<{ q: string; a: string }>;

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-24">
            <a
              href={`/${locale}/`}
              className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {tCommon("back")}
            </a>
            <p className="mt-6 text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
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
                href="mailto:donate@humanagingsimulators.org?subject=HAS%20donor%20inquiry"
                className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:opacity-90"
              >
                {t("hero.ctaPrimary")}
              </a>
              <a
                href={`/${locale}/#transparency`}
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
                    className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500"
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

        {/* TIERS */}
        <section className="border-t border-black/5 py-20 dark:border-white/10">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {t("tiers.title")}
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {t("tiers.subtitle")}
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {tiers.map((tier, idx) => {
                const highlighted = idx === tiers.length - 1;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col rounded-2xl border p-6 ${
                      highlighted
                        ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/30"
                        : "border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
                    }`}
                  >
                    <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                      {tier.name}
                    </p>
                    <p className="mt-3 text-xl font-semibold">{tier.amount}</p>
                    <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {tier.description}
                    </p>
                  </div>
                );
              })}
            </div>
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
              href="mailto:donate@humanagingsimulators.org?subject=HAS%20donor%20inquiry"
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
