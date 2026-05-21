import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactForm } from "@/components/ContactForm";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });

  const languages: Record<string, string> = { "x-default": "/en/contact/" };
  for (const l of routing.locales) {
    languages[l] = `/${l}/contact/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/contact/`,
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

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ContactPage");
  const tCommon = await getTranslations("PageCommon");

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
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

        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-6">
            <ContactForm locale={locale} />
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
