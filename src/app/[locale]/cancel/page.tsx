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
  const t = await getTranslations({ locale, namespace: "CancelPage" });

  const languages: Record<string, string> = { "x-default": "/en/cancel/" };
  for (const l of routing.locales) {
    languages[l] = `/${l}/cancel/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}/cancel/`,
      languages,
    },
  };
}

export default async function CancelPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("CancelPage");

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-24 pb-20 text-center sm:pt-32">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-6 text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {t("message")}
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={`/${locale}/donate/#donate-form`}
              className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:opacity-90"
            >
              {t("tryAgain")}
            </a>
            <a
              href={`/${locale}/`}
              className="inline-flex h-12 items-center justify-center rounded-full border border-current px-6 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
            >
              {t("backHome")}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
