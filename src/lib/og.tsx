/**
 * Helper compartido para Open Graph images dinámicas (Next 16 `ImageResponse`).
 *
 * Las OG images sirven a redes sociales (X, LinkedIn, WhatsApp, Slack, etc.)
 * que renderizan una preview al pegar el link. Cada idioma tiene su versión
 * porque `name`, `slogan` y page-specific text vienen del catálogo i18n.
 *
 * Diseño 1200×630 (Open Graph estándar): gradiente sutil del color de
 * acento, logo "H" en círculo, eyebrow chiquito, título grande, subtítulo,
 * y dominio `haslife.org` abajo a la izquierda.
 *
 * Las fonts se cargan dinámicamente según el script del locale: Noto Sans
 * (latin + cyrillic, default) y Noto Sans Arabic / JP / SC / Devanagari
 * para los locales que requieren shaping complejo. `ImageResponse` solo
 * soporta TTF/OTF/WOFF (no WOFF2) — usamos fontsource WOFF.
 */
import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export function ogStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// ---- Font loading -----------------------------------------------------------

type ScriptKey =
  | "latin"
  | "cyrillic"
  | "arabic"
  | "japanese"
  | "chinese-simplified"
  | "devanagari";

// Cada locale puede requerir múltiples scripts (p.ej. ar suele tener latín
// para términos como "HAS", URLs, números arábigos occidentales).
const LOCALE_SCRIPTS: Record<string, ScriptKey[]> = {
  es: ["latin"],
  en: ["latin"],
  pt: ["latin"],
  fr: ["latin"],
  it: ["latin"],
  de: ["latin"],
  ru: ["cyrillic", "latin"],
  ar: ["arabic", "latin"],
  ja: ["japanese", "latin"],
  zh: ["chinese-simplified", "latin"],
  hi: ["devanagari", "latin"],
};

// Path a cada woff dentro de `node_modules/@fontsource/...`. Format:
// [paquete fontsource, archivo woff dentro de files/]
const FONT_FILES: Record<
  ScriptKey,
  { pkg: string; file400: string; file700: string }
> = {
  latin: {
    pkg: "noto-sans",
    file400: "noto-sans-latin-400-normal.woff",
    file700: "noto-sans-latin-700-normal.woff",
  },
  cyrillic: {
    pkg: "noto-sans",
    file400: "noto-sans-cyrillic-400-normal.woff",
    file700: "noto-sans-cyrillic-700-normal.woff",
  },
  arabic: {
    // satori (motor de next/og) no implementa GSUB Lookup Type 5 Format 3
    // que usa Noto Sans Arabic — falla con
    // `lookupType: 5 - substFormat: 3 is not yet supported`. Cairo es
    // una fuente árabe moderna con shaping más simple compatible.
    pkg: "cairo",
    file400: "cairo-arabic-400-normal.woff",
    file700: "cairo-arabic-700-normal.woff",
  },
  japanese: {
    pkg: "noto-sans-jp",
    file400: "noto-sans-jp-japanese-400-normal.woff",
    file700: "noto-sans-jp-japanese-700-normal.woff",
  },
  "chinese-simplified": {
    pkg: "noto-sans-sc",
    file400: "noto-sans-sc-chinese-simplified-400-normal.woff",
    file700: "noto-sans-sc-chinese-simplified-700-normal.woff",
  },
  devanagari: {
    pkg: "noto-sans-devanagari",
    file400: "noto-sans-devanagari-devanagari-400-normal.woff",
    file700: "noto-sans-devanagari-devanagari-700-normal.woff",
  },
};

const fontCache = new Map<string, ArrayBuffer>();

function loadFontFile(pkg: string, file: string): ArrayBuffer {
  const cacheKey = `${pkg}/${file}`;
  const hit = fontCache.get(cacheKey);
  if (hit) return hit;
  const fullPath = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    pkg,
    "files",
    file,
  );
  const buf = fs.readFileSync(fullPath);
  // Buffer → ArrayBuffer (slice exacto del segment usado).
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  fontCache.set(cacheKey, ab);
  return ab;
}

type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

function loadFontsForLocale(locale: string): SatoriFont[] {
  const scripts = LOCALE_SCRIPTS[locale] ?? ["latin"];
  const fonts: SatoriFont[] = [];
  for (const script of scripts) {
    const cfg = FONT_FILES[script];
    fonts.push(
      {
        name: "NotoSans",
        data: loadFontFile(cfg.pkg, cfg.file400),
        weight: 400,
        style: "normal",
      },
      {
        name: "NotoSans",
        data: loadFontFile(cfg.pkg, cfg.file700),
        weight: 700,
        style: "normal",
      },
    );
  }
  return fonts;
}

// ---- Template ---------------------------------------------------------------

type AccentKey = "emerald" | "amber" | "sky" | "rose" | "indigo";

type AccentColors = {
  bg: string;
  fg: string;
  border: string;
};

const ACCENTS: Record<AccentKey, AccentColors> = {
  emerald: { bg: "#ecfdf5", fg: "#047857", border: "#10b981" },
  amber: { bg: "#fffbeb", fg: "#b45309", border: "#f59e0b" },
  sky: { bg: "#f0f9ff", fg: "#0369a1", border: "#0ea5e9" },
  rose: { bg: "#fff1f2", fg: "#be123c", border: "#f43f5e" },
  indigo: { bg: "#eef2ff", fg: "#4338ca", border: "#6366f1" },
};

export type OgTemplateProps = {
  locale: string;
  brand: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  accent?: AccentKey;
};

export function renderOgImage(props: OgTemplateProps): ImageResponse {
  const accent = ACCENTS[props.accent ?? "emerald"];
  const fonts = loadFontsForLocale(props.locale);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, ${accent.bg} 0%, #ffffff 60%, #ffffff 100%)`,
        padding: "72px",
        fontFamily: "NotoSans",
      }}
    >
      {/* Top row: logo + brand name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "9999px",
            background: "#0a0a0a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            fontWeight: 700,
          }}
        >
          H
        </div>
        <div
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "#0a0a0a",
            letterSpacing: "-0.01em",
          }}
        >
          {props.brand}
        </div>
      </div>

      {/* Eyebrow */}
      <div
        style={{
          marginTop: "auto",
          fontSize: "20px",
          fontWeight: 700,
          color: accent.fg,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        {props.eyebrow}
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: "16px",
          fontSize: "76px",
          fontWeight: 700,
          color: "#0a0a0a",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          maxWidth: "1000px",
        }}
      >
        {props.title}
      </div>

      {/* Subtitle */}
      {props.subtitle ? (
        <div
          style={{
            marginTop: "20px",
            fontSize: "28px",
            fontWeight: 400,
            color: "#3f3f46",
            lineHeight: 1.35,
            maxWidth: "1000px",
          }}
        >
          {props.subtitle}
        </div>
      ) : null}

      {/* Bottom row: domain + accent stripe */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "40px",
        }}
      >
        <div
          style={{
            fontSize: "22px",
            fontWeight: 400,
            color: "#71717a",
          }}
        >
          haslife.org
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "8px",
              background: "#10b981",
              borderRadius: "9999px",
            }}
          />
          <div
            style={{
              width: "32px",
              height: "8px",
              background: "#f59e0b",
              borderRadius: "9999px",
            }}
          />
          <div
            style={{
              width: "32px",
              height: "8px",
              background: "#f43f5e",
              borderRadius: "9999px",
            }}
          />
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
