import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HopefulHorizon } from "@/components/HopefulHorizon";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHero = await getTranslations("Hero");
  const tSite = await getTranslations("Site");
  const tMission = await getTranslations("Mission");
  const tVision = await getTranslations("Vision");
  const tHow = await getTranslations("HowWeDoIt");
  const tSystem = await getTranslations("System");
  const tDisciplines = await getTranslations("Disciplines");
  const tRoles = await getTranslations("Roles");
  const tPrivacy = await getTranslations("Privacy");
  const tRoadmap = await getTranslations("Roadmap");
  const tPrinciples = await getTranslations("Principles");
  const tStatus = await getTranslations("Status");
  const tFinal = await getTranslations("FinalCta");

  const howKeys = ["money", "data", "knowledge"] as const;
  const layerKeys = [
    "data",
    "biological",
    "causal",
    "intervention",
    "safety",
    "longevity",
  ] as const;
  const disciplineKeys = [
    "genomics",
    "epigenomics",
    "transcriptomics",
    "proteomics",
    "metabolomics",
    "cellAging",
    "immunology",
    "systemsAi",
    "regenerative",
    "ethics",
  ] as const;
  const phaseKeys = ["phase1", "phase2", "phase3", "phase4"] as const;
  const principleKeys = [
    "openScience",
    "transparency",
    "ethicalAi",
    "humanityFirst",
    "reproducible",
    "anonymizedData",
    "globalAccess",
    "notMedical",
  ] as const;

  const nodeItems = tSystem.raw("node.items") as string[];
  const privacyItems = tPrivacy.raw("items") as string[];

  const roles = [
    {
      key: "citizen",
      href: `/${locale}/citizens/`,
      accent: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
      cta: "bg-foreground text-background hover:opacity-90",
    },
    {
      key: "collaborator",
      href: `/${locale}/collaborators/`,
      accent:
        "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
      cta: "border border-current hover:bg-black/5 dark:hover:bg-white/10",
    },
  ] as const;

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <p
              aria-label={tSite("slogan")}
              className="bg-gradient-to-r from-emerald-600 via-amber-500 to-rose-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl"
            >
              {tSite("slogan")}
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-700 italic sm:text-base dark:text-zinc-300">
              {tSite("sloganTagline")}
            </p>
            <p className="mt-8 text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tHero("eyebrow")}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              {tHero("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              {tHero("subtitle")}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={`/${locale}/citizens/`}
                className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:opacity-90"
              >
                {tHero("ctaShareData")}
              </a>
              <a
                href={`/${locale}/collaborators/`}
                className="inline-flex h-12 items-center justify-center rounded-full border border-current px-6 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
              >
                {tHero("ctaCollaborate")}
              </a>
            </div>

            <dl className="mt-16 grid gap-6 border-t border-black/5 pt-10 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
              {[
                ["metricGoal", "metricGoalDesc"],
                ["metricInputs", "metricInputsDesc"],
                ["metricOpen", "metricOpenDesc"],
                ["metricGovernance", "metricGovernanceDesc"],
              ].map(([k, d]) => (
                <div key={k}>
                  <dt className="text-base font-semibold">{tHero(k)}</dt>
                  <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {tHero(d)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* MISSION */}
        <section
          id="mission"
          className="border-t border-black/5 py-24 dark:border-white/10"
        >
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tMission("eyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {tMission("title")}
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              <p>{tMission("p1")}</p>
              <p>{tMission("p2")}</p>
              <p>{tMission("p3")}</p>
            </div>

            <figure className="mt-12 rounded-2xl border-l-4 border-emerald-500 bg-emerald-50/60 p-8 dark:border-emerald-400 dark:bg-emerald-950/20">
              <figcaption className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                {tMission("visionStatementLabel")}
              </figcaption>
              <blockquote className="mt-3 text-xl leading-relaxed font-medium tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
                <span aria-hidden className="text-emerald-500">
                  “
                </span>
                {tMission("visionStatement")}
                <span aria-hidden className="text-emerald-500">
                  ”
                </span>
              </blockquote>
            </figure>
          </div>
        </section>

        {/* VISION — Hopeful pull-quote with illustration */}
        <section
          id="vision"
          className="relative overflow-hidden border-t border-black/5 dark:border-white/10"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <p className="text-xs font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-400">
                {tVision("eyebrow")}
              </p>
              <blockquote className="mt-5 text-2xl leading-relaxed font-medium tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                <span aria-hidden className="text-amber-500">
                  “
                </span>
                {tVision("quote")}
                <span aria-hidden className="text-amber-500">
                  ”
                </span>
              </blockquote>
              <p className="mt-6 text-base leading-7 text-zinc-700 dark:text-zinc-300">
                {tVision("body")}
              </p>
              <a
                href={`/${locale}/citizens/`}
                className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-6 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
              >
                {tVision("joinLabel")} →
              </a>
            </div>
            <div className="overflow-hidden rounded-3xl border border-black/5 shadow-sm dark:border-white/10">
              <HopefulHorizon
                ariaLabel={tVision("imageAlt")}
                className="block h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* HOW WE DO IT — 3 ways */}
        <section className="border-t border-black/5 bg-zinc-50 py-24 dark:border-white/10 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tHow("eyebrow")}
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {tHow("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tHow("subtitle")}
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {howKeys.map((key) => (
                <article
                  key={key}
                  className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950"
                >
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {tHow(`items.${key}.tag`)}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">
                    {tHow(`items.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {tHow(`items.${key}.description`)}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-10 max-w-3xl text-sm text-zinc-600 italic dark:text-zinc-400">
              {tHow("footnote")}
            </p>
          </div>
        </section>

        {/* SYSTEM — Layers + Longevity Node */}
        <section
          id="system"
          className="border-t border-black/5 py-24 dark:border-white/10"
        >
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tSystem("eyebrow")}
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {tSystem("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tSystem("subtitle")}
            </p>

            <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {layerKeys.map((key) => (
                <li
                  key={key}
                  className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
                >
                  <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                    {tSystem(`layers.${key}.label`)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    {tSystem(`layers.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {tSystem(`layers.${key}.description`)}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <h3 className="text-xl font-semibold">{tSystem("node.title")}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {tSystem("node.intro")}
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {nodeItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300"
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
          </div>
        </section>

        {/* DISCIPLINES */}
        <section
          id="disciplines"
          className="border-t border-black/5 bg-zinc-50 py-24 dark:border-white/10 dark:bg-zinc-900/30"
        >
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tDisciplines("eyebrow")}
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {tDisciplines("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tDisciplines("subtitle")}
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {disciplineKeys.map((key) => (
                <div
                  key={key}
                  className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
                >
                  <h3 className="text-base font-semibold">
                    {tDisciplines(`items.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {tDisciplines(`items.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ROLES — Benefits per role with deep links */}
        <section
          id="roles"
          className="border-t border-black/5 py-24 dark:border-white/10"
        >
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tRoles("eyebrow")}
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {tRoles("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tRoles("subtitle")}
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {roles.map((role) => {
                const benefits = tRoles.raw(`${role.key}.benefits`) as string[];
                return (
                  <article
                    key={role.key}
                    className="flex flex-col rounded-2xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950"
                  >
                    <span
                      className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${role.accent}`}
                    >
                      {tRoles(`${role.key}.tag`)}
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold">
                      {tRoles(`${role.key}.title`)}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {tRoles(`${role.key}.intro`)}
                    </p>
                    <ul className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {benefits.map((b, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span aria-hidden className="text-emerald-600">
                            ✓
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-6">
                      <a
                        href={role.href}
                        className={`inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold ${role.cta}`}
                      >
                        {tRoles(`${role.key}.cta`)} →
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* PRIVACY */}
        <section
          id="privacy"
          className="border-t border-black/5 bg-zinc-50 py-24 dark:border-white/10 dark:bg-zinc-900/30"
        >
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tPrivacy("eyebrow")}
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {tPrivacy("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tPrivacy("subtitle")}
            </p>
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {privacyItems.map((item, idx) => (
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

        {/* ROADMAP */}
        <section
          id="roadmap"
          className="border-t border-black/5 py-24 dark:border-white/10"
        >
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tRoadmap("eyebrow")}
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {tRoadmap("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tRoadmap("subtitle")}
            </p>

            <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {phaseKeys.map((key, idx) => {
                const isActive = idx === 0;
                return (
                  <li
                    key={key}
                    className={`rounded-2xl border p-6 ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/30"
                        : "border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold tracking-wider uppercase ${
                        isActive
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-zinc-500"
                      }`}
                    >
                      {tRoadmap(`${key}.label`)}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold">
                      {tRoadmap(`${key}.title`)}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {tRoadmap(`${key}.description`)}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* PRINCIPLES */}
        <section
          id="principles"
          className="border-t border-black/5 bg-zinc-50 py-24 dark:border-white/10 dark:bg-zinc-900/30"
        >
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tPrinciples("eyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {tPrinciples("title")}
            </h2>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {principleKeys.map((key) => (
                <div
                  key={key}
                  className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
                >
                  <h3 className="text-base font-semibold">
                    {tPrinciples(`items.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {tPrinciples(`items.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATUS / TRANSPARENCY */}
        <section
          id="transparency"
          className="border-t border-black/5 py-24 dark:border-white/10"
        >
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              {tStatus("eyebrow")}
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {tStatus("title")}
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
              <p>{tStatus("p1")}</p>
              <p>{tStatus("p2")}</p>
            </div>

            <dl className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["metricStage", "metricStageValue"],
                ["metricTeam", "metricTeamValue"],
                ["metricFunding", "metricFundingValue"],
                ["metricTransparency", "metricTransparencyValue"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
                >
                  <dt className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                    {tStatus(k)}
                  </dt>
                  <dd className="mt-2 text-base font-semibold">{tStatus(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="border-t border-black/5 bg-zinc-50 py-24 dark:border-white/10 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {tFinal("title")}
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {tFinal("subtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={`/${locale}/citizens/`}
                className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:opacity-90"
              >
                {tFinal("shareLabel")}
              </a>
              <a
                href={`/${locale}/collaborators/`}
                className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold hover:underline"
              >
                {tFinal("researchLabel")} →
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
