import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

// Ficha técnica del dataset (datos, no traducibles). El DOI se rellena cuando
// el release se publique en Zenodo (`has-data publish --zenodo --publish`).
const DATASET = {
  version: "1.0.0",
  author: "Castillejos, A.",
  year: 2026,
  personsApprox: "≈12.7M",
  yearsRange: "1950–2023",
  fraction: "10%",
  license: "CC-BY 4.0",
  doi: null as string | null,
  bibtexKey: "has_synthpop_mex_1_0_0",
};

function doiUrl(doi: string) {
  return `https://doi.org/${doi}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DatasetsPage" });

  const languages: Record<string, string> = {
    "x-default": "/en/datasets/",
  };
  for (const l of routing.locales) {
    languages[l] = `/${l}/datasets/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/datasets/`,
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

export default async function DatasetsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("DatasetsPage");
  const tCommon = await getTranslations("PageCommon");

  const datasetTitle = `HAS Synthetic Population Dataset — México v${DATASET.version}`;
  const citationPlain = `${DATASET.author} (${DATASET.year}). ${datasetTitle} [Data set]. Zenodo. ${
    DATASET.doi ? doiUrl(DATASET.doi) : t("card.doiPending")
  }`;
  const bibtex = [
    `@dataset{${DATASET.bibtexKey},`,
    `  author    = {${DATASET.author}},`,
    `  title     = {${datasetTitle}},`,
    `  year      = {${DATASET.year}},`,
    `  publisher = {Zenodo},`,
    `  version   = {${DATASET.version}},`,
    `  license   = {${DATASET.license}},`,
    DATASET.doi
      ? `  doi       = {${DATASET.doi}}`
      : `  note      = {DOI pending}`,
    `}`,
  ].join("\n");

  const stats = [
    { label: t("stats.personsLabel"), value: DATASET.personsApprox },
    { label: t("stats.yearsLabel"), value: DATASET.yearsRange },
    { label: t("stats.fractionLabel"), value: DATASET.fraction },
    { label: t("stats.licenseLabel"), value: DATASET.license },
  ];

  const limitations = [
    t("method.limitations.nse"),
    t("method.limitations.layer1"),
    t("method.limitations.biomed"),
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
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-3xl space-y-12 px-6">
            {/* Qué son estos datasets */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("intro.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("intro.body")}
              </p>
            </div>

            {/* Ficha del dataset destacado */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("card.heading")}
              </h2>
              <div className="mt-4 rounded-lg border border-sky-200 bg-white p-5 dark:border-sky-900/40 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{datasetTitle}</h3>
                  {DATASET.doi ? (
                    <a
                      href={doiUrl(DATASET.doi)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:underline dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      DOI {DATASET.doi}
                    </a>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {t("card.statusPending")}
                    </span>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        {s.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <span aria-hidden>✓</span>
                  <span>
                    <span className="font-semibold">
                      {t("stats.validationLabel")}:
                    </span>{" "}
                    {t("stats.validationValue")}
                  </span>
                </div>
              </div>
            </div>

            {/* Método de generación */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("method.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("method.body")}
              </p>
              <h3 className="mt-6 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
                {t("method.limitationsTitle")}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                {limitations.map((item) => (
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

            {/* Garantía de privacidad */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("privacy.title")}
              </h2>
              <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                {t("privacy.body")}
              </div>
            </div>

            {/* Cómo citar */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("cite.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("cite.intro")}
              </p>
              <p className="mt-4 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {t("cite.plainLabel")}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {citationPlain}
              </pre>
              <p className="mt-4 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {t("cite.bibtexLabel")}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {bibtex}
              </pre>
            </div>

            <div>
              <p className="text-xs text-zinc-500">
                {t("updatedAt", { date: "2026-07-08" })}
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
