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
 * `ImageResponse` corre en runtime edge/node — sin React full, solo HTML
 * + styles inline + fonts del sistema (V1, sin custom fonts).
 */
import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Locales que el renderer de `ImageResponse` puede dibujar con la fuente
 * del sistema sin shaping complejo. Excluimos por ahora los scripts que
 * requieren fuentes específicas (ar/ja/zh/hi) — V2 cargar Noto Sans
 * Arabic/JP/SC/Devanagari y soportar los 11.
 */
const OG_SUPPORTED_LOCALES = ["es", "en", "pt", "fr", "it", "de", "ru"];

export function ogStaticParams() {
  return routing.locales
    .filter((l) => OG_SUPPORTED_LOCALES.includes(l))
    .map((locale) => ({ locale }));
}

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
  brand: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  accent?: AccentKey;
};

export function renderOgImage(props: OgTemplateProps): ImageResponse {
  const accent = ACCENTS[props.accent ?? "emerald"];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, ${accent.bg} 0%, #ffffff 60%, #ffffff 100%)`,
        padding: "72px",
        fontFamily: "system-ui, sans-serif",
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
            fontWeight: 600,
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
            fontWeight: 500,
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
    { ...OG_SIZE },
  );
}
