import { getTranslations } from "next-intl/server";
import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
  ogStaticParams,
} from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Human Aging Simulators";

export function generateStaticParams() {
  return ogStaticParams();
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tSite = await getTranslations({ locale, namespace: "Site" });
  const tHero = await getTranslations({ locale, namespace: "Hero" });

  return renderOgImage({
    locale,
    brand: tSite("name"),
    eyebrow: tSite("slogan"),
    title: tHero("title"),
    subtitle: tHero("subtitle"),
    accent: "emerald",
  });
}
