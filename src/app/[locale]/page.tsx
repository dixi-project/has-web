import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tDisclaimer = await getTranslations("Disclaimer");

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {t("subtitle")}
      </p>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <a
          href={`/${locale}/donate/`}
          className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-6 font-medium hover:opacity-90"
        >
          {t("ctaDonate")}
        </a>
        <a
          href={`/${locale}/participate/`}
          className="inline-flex h-12 items-center justify-center rounded-full border border-current px-6 font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          {t("ctaParticipate")}
        </a>
      </div>
      <p className="mt-12 text-sm text-zinc-500 italic">
        {t("scaffoldNotice")}
      </p>
      <footer className="mt-24 max-w-xl text-xs text-zinc-500">
        {tDisclaimer("notMedicalDevice")}
      </footer>
    </main>
  );
}
