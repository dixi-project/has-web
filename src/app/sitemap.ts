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
  { path: "contact", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "privacy", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "licenses", priority: 0.4, changeFrequency: "monthly" as const },
  {
    path: "transparency",
    priority: 0.5,
    changeFrequency: "monthly" as const,
  },
];

function url(locale: string, p: string) {
  return p ? `${SITE}/${locale}/${p}/` : `${SITE}/${locale}/`;
}

/**
 * Un sitemap por idioma. Next.js genera automáticamente el índice
 * `sitemap.xml` que apunta a `/sitemap/<id>.xml` para cada id devuelto
 * aquí. Mejor práctica SEO para sitios multi-idioma (Google reco).
 */
export async function generateSitemaps() {
  return routing.locales.map((id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const locale = await id;

  return PATHS.map(({ path, priority, changeFrequency }) => {
    const languages: Record<string, string> = {
      "x-default": url(routing.defaultLocale, path),
    };
    for (const l of routing.locales) {
      languages[l] = url(l, path);
    }

    return {
      url: url(locale, path),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages },
    };
  });
}
