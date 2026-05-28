import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

const DEPS = [
  { name: "Next.js", license: "MIT", url: "https://github.com/vercel/next.js" },
  { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
  {
    name: "Tailwind CSS",
    license: "MIT",
    url: "https://github.com/tailwindlabs/tailwindcss",
  },
  {
    name: "next-intl",
    license: "MIT",
    url: "https://github.com/amannn/next-intl",
  },
  {
    name: "Drizzle ORM",
    license: "Apache-2.0",
    url: "https://github.com/drizzle-team/drizzle-orm",
  },
  {
    name: "AWS SDK v3",
    license: "Apache-2.0",
    url: "https://github.com/aws/aws-sdk-js-v3",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LicensesPage" });

  const languages: Record<string, string> = { "x-default": "/en/licenses/" };
  for (const l of routing.locales) {
    languages[l] = `/${l}/licenses/`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/licenses/`,
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

export default async function LicensesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("LicensesPage");
  const tCommon = await getTranslations("PageCommon");

  const sections = [
    {
      title: t("code.title"),
      body: t.rich("code.body", {
        link: (chunks) => (
          <a
            href="https://github.com/dixi-project/has-web/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {chunks}
          </a>
        ),
      }),
    },
    {
      title: t("docs.title"),
      body: t.rich("docs.body", {
        link: (chunks) => (
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {chunks}
          </a>
        ),
      }),
    },
    {
      title: t("data.title"),
      body: t.rich("data.body", {
        link: (chunks) => (
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {chunks}
          </a>
        ),
      }),
    },
  ];

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
          <div className="mx-auto max-w-3xl space-y-12 px-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                  {section.body}
                </p>
              </div>
            ))}

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("deps.title")}
              </h2>
              <p className="mt-3 text-zinc-700 dark:text-zinc-300">
                {t("deps.intro")}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {DEPS.map((d) => (
                  <li
                    key={d.name}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-zinc-800 hover:underline dark:text-zinc-200"
                    >
                      {d.name}
                    </a>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {d.license}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-zinc-500">{t("deps.note")}</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
