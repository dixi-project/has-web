import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export const dynamic = "force-static";

const SITE = "https://haslife.org";

/**
 * `robots.txt` declara todos los sitemaps por idioma explícitamente. Google
 * permite múltiples directivas `Sitemap:`. Esto es preferible a un index
 * `sitemap.xml` único — Google encuentra los sitemaps al primer hit del
 * crawler sin un fetch extra.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/_next/", "/api/"],
      },
    ],
    sitemap: routing.locales.map((l) => `${SITE}/sitemap/${l}.xml`),
    host: SITE,
  };
}
