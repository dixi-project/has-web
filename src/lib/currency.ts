// Detección de moneda del donante y presets equivalentes.
// El servidor (Lambda) valida que la moneda venga de la lista soportada.
// Stripe procesa en la moneda elegida y convierte automáticamente
// a USD en el settlement de la cuenta nonprofit.

export const SUPPORTED_CURRENCIES = [
  "usd",
  "mxn",
  "eur",
  "gbp",
  "brl",
  "cad",
  "aud",
  "jpy",
  "inr",
  "ars",
  "cop",
  "clp",
  "pen",
  "uyu",
  "chf",
  "sek",
  "nok",
  "dkk",
  "nzd",
  "sgd",
  "hkd",
  "twd",
  "krw",
  "zar",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Mapeo de país (ISO 3166-1 alpha-2) → moneda.
// Cubre los mercados más relevantes para HAS según tráfico esperado.
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  // América
  US: "usd",
  MX: "mxn",
  CA: "cad",
  BR: "brl",
  AR: "ars",
  CO: "cop",
  CL: "clp",
  PE: "pen",
  UY: "uyu",
  // Eurozona
  ES: "eur",
  FR: "eur",
  DE: "eur",
  IT: "eur",
  NL: "eur",
  PT: "eur",
  BE: "eur",
  AT: "eur",
  IE: "eur",
  FI: "eur",
  GR: "eur",
  LU: "eur",
  MT: "eur",
  SK: "eur",
  SI: "eur",
  EE: "eur",
  LV: "eur",
  LT: "eur",
  CY: "eur",
  // Otros europeos
  GB: "gbp",
  CH: "chf",
  SE: "sek",
  NO: "nok",
  DK: "dkk",
  // Asia
  JP: "jpy",
  IN: "inr",
  SG: "sgd",
  HK: "hkd",
  TW: "twd",
  KR: "krw",
  // Oceanía
  AU: "aud",
  NZ: "nzd",
  // África
  ZA: "zar",
};

// Fallback por idioma cuando el país no se detecta.
// El idioma viene de la URL del sitio (/es/, /en/, ...).
const LOCALE_TO_CURRENCY: Record<string, SupportedCurrency> = {
  es: "usd", // tantos países LATAM que no asumimos uno, mejor USD
  en: "usd",
  pt: "brl",
  fr: "eur",
  it: "eur",
  de: "eur",
  ru: "usd", // RUB tiene restricciones en Stripe
  ja: "jpy",
  zh: "usd", // CNY tiene restricciones, mejor USD
  hi: "inr",
  ar: "usd", // varios países árabes, sin currency unificada
};

// Presets equivalentes por divisa.
// Filosofía: tres niveles que reflejen el espíritu de los tiers ($5/$50/$500 USD)
// pero ajustados a poder adquisitivo local cuando aplica.
export const PRESETS_BY_CURRENCY: Record<
  SupportedCurrency,
  [number, number, number]
> = {
  usd: [5, 50, 500],
  mxn: [100, 1000, 10000],
  eur: [5, 50, 500],
  gbp: [5, 50, 500],
  brl: [25, 250, 2500],
  cad: [10, 100, 1000],
  aud: [10, 100, 1000],
  jpy: [750, 7500, 75000],
  inr: [400, 4000, 40000],
  ars: [5000, 50000, 500000],
  cop: [20000, 200000, 2000000],
  clp: [5000, 50000, 500000],
  pen: [20, 200, 2000],
  uyu: [200, 2000, 20000],
  chf: [5, 50, 500],
  sek: [50, 500, 5000],
  nok: [50, 500, 5000],
  dkk: [35, 350, 3500],
  nzd: [10, 100, 1000],
  sgd: [7, 70, 700],
  hkd: [40, 400, 4000],
  twd: [150, 1500, 15000],
  krw: [7000, 70000, 700000],
  zar: [100, 1000, 10000],
};

export function detectCurrency(locale: string): SupportedCurrency {
  if (typeof navigator !== "undefined" && navigator.language) {
    const parts = navigator.language.split("-");
    if (parts.length > 1) {
      const region = parts[1].toUpperCase();
      const mapped = COUNTRY_TO_CURRENCY[region];
      if (mapped) return mapped;
    }
  }
  return LOCALE_TO_CURRENCY[locale] ?? "usd";
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount}`;
  }
}

export function currencySymbol(
  currency: SupportedCurrency,
  locale: string,
): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).formatToParts(0);
    return (
      parts.find((p) => p.type === "currency")?.value ?? currency.toUpperCase()
    );
  } catch {
    return currency.toUpperCase();
  }
}
