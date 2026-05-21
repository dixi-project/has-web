import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export const dynamic = "force-static";

const SITE = "https://haslife.org";

const PATHS = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "donate", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "citizens", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "collaborators", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "simulator", priority: 0.9, changeFrequency: "weekly" as const },
];

function url(locale: string, p: string) {
  return p ? `${SITE}/${locale}/${p}/` : `${SITE}/${locale}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PATHS.flatMap(({ path, priority, changeFrequency }) => {
    const languages: Record<string, string> = {
      "x-default": url(routing.defaultLocale, path),
    };
    for (const l of routing.locales) {
      languages[l] = url(l, path);
    }

    return routing.locales.map((locale) => ({
      url: url(locale, path),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
