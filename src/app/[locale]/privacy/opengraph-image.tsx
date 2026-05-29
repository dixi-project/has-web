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
export const alt = "Privacy — Human Aging Simulators";

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
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });

  return renderOgImage({
    brand: tSite("name"),
    eyebrow: t("eyebrow"),
    title: t("title"),
    subtitle: t("subtitle"),
    accent: "sky",
  });
}
