#!/usr/bin/env node
// Traduce messages/<source>.json a los locales objetivo usando AWS Bedrock
// (mismo path que el resto de invocaciones LLM del proyecto: NLP redact V2,
// monthly reports generator). Usa el inference profile us-east-1.
//
// Uso:
//   AWS_PROFILE=dixi node scripts/translate-i18n.mjs
//   AWS_PROFILE=dixi node scripts/translate-i18n.mjs --target pt,fr
//   AWS_PROFILE=dixi node scripts/translate-i18n.mjs --only-missing
//
// Flags:
//   --target=<csv>      Locales a generar. Por defecto: los 9 no-fuente
//   --only-missing      Sólo traduce claves nuevas o que cambiaron (incremental)
//   --dry-run           Imprime qué haría sin escribir archivos
//
// Convenciones:
//   - es.json es la fuente de verdad
//   - Cada archivo destino lleva $meta con autoría y fecha
//   - Términos en PRESERVE_TERMS no se traducen nunca

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MESSAGES_DIR = path.join(ROOT, "messages");
const SOURCE_LOCALE = "es";
const DEFAULT_TARGETS = [
  "en",
  "pt",
  "fr",
  "it",
  "de",
  "ru",
  "ja",
  "zh",
  "hi",
  "ar",
];
const MODEL = "us.anthropic.claude-sonnet-4-6";
const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
const BATCH_SIZE = 60;

const PRESERVE_TERMS = [
  "Human Aging Simulators",
  "HAS",
  "HAS+LIFE",
  "FHIR",
  "OMOP",
  "OMOP CDM",
  "LOINC",
  "SNOMED",
  "RxNorm",
  "ICD-10",
  "UCUM",
  "PHQ-9",
  "GAD-7",
  "PSS-10",
  "DSR",
  "GDPR",
  "HIPAA",
  "LGPD",
  "LFPDPPP",
  "MFA",
  "TOTP",
  "RBAC",
  "k-anonymity",
  "DOI",
  "DICOM",
  "PDF",
  "CSV",
  "JSON",
  "API",
  "URL",
  "S3",
  "KMS",
  "AWS",
  "Cognito",
  "Aurora",
  "Bedrock",
  "Semantic Scholar",
  "ORCID",
  "Zenodo",
  "Stripe",
  "Bergman",
  "ATP",
  "ROS",
  "IL-6",
  "TNF-α",
  "CRP",
  "FEV1",
  "FVC",
  "eGFR",
  "HbA1c",
  "ATC",
  "Claude",
  "V1",
  "V2",
];

const LOCALE_LABEL = {
  en: "English (US)",
  pt: "Brazilian Portuguese",
  fr: "French (France)",
  it: "Italian (Italy)",
  de: "German (Germany)",
  ru: "Russian",
  ja: "Japanese",
  zh: "Simplified Chinese",
  hi: "Hindi (India)",
  ar: "Modern Standard Arabic",
};

// ---------- args ----------
const args = process.argv.slice(2);
function flag(name) {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0) return args[idx + 1] ?? true;
  return null;
}
const targetArg = flag("target");
const targets = targetArg
  ? String(targetArg)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : DEFAULT_TARGETS;
const onlyMissing = args.includes("--only-missing");
const dryRun = args.includes("--dry-run");

// Las credenciales AWS se resuelven del entorno estándar: AWS_PROFILE +
// ~/.aws/credentials, o variables AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY.
const bedrock = dryRun
  ? null
  : new BedrockRuntimeClient({ region: AWS_REGION });

// ---------- flatten / unflatten ----------
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object") flatten(item, `${key}[${i}]`, out);
        else out[`${key}[${i}]`] = item;
      });
    } else if (typeof v === "object") {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function unflatten(map) {
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const parts = [];
    let buf = "";
    for (let i = 0; i < key.length; i++) {
      const c = key[i];
      if (c === ".") {
        if (buf) parts.push({ type: "key", v: buf });
        buf = "";
      } else if (c === "[") {
        if (buf) parts.push({ type: "key", v: buf });
        buf = "";
        const end = key.indexOf("]", i);
        parts.push({ type: "idx", v: Number(key.slice(i + 1, end)) });
        i = end;
      } else {
        buf += c;
      }
    }
    if (buf) parts.push({ type: "key", v: buf });

    let cur = out;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const next = parts[i + 1];
      const isLast = i === parts.length - 1;
      if (p.type === "key") {
        if (isLast) {
          cur[p.v] = value;
        } else {
          if (cur[p.v] === undefined) cur[p.v] = next.type === "idx" ? [] : {};
          cur = cur[p.v];
        }
      } else {
        if (isLast) {
          cur[p.v] = value;
        } else {
          if (cur[p.v] === undefined) cur[p.v] = next.type === "idx" ? [] : {};
          cur = cur[p.v];
        }
      }
    }
  }
  return out;
}

// ---------- API ----------
async function callClaude(messages) {
  // Bedrock InvokeModel — payload "anthropic-claude-messages" estándar.
  const command = new InvokeModelCommand({
    modelId: MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 16000,
      messages,
    }),
  });
  const res = await bedrock.send(command);
  const data = JSON.parse(new TextDecoder().decode(res.body));
  return data.content?.[0]?.text ?? "";
}

/**
 * Repara un JSON line-based donde el modelo dejó comillas dobles ASCII
 * sin escapar dentro de un VALUE string. Asume el formato canónico de
 * `JSON.stringify(obj, null, 2)`:
 *     "  \"key\": \"value\"[,]"
 * Para cada línea, identifica el primer `"` post-`: ` (apertura del value)
 * y el último `"` antes de `,` / fin-de-línea (cierre del value); escapa
 * cualquier `"` intermedia. NO toca líneas estructurales (`{`, `}`, etc.).
 */
function repairJsonLineBased(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(\s*"[^"]+":\s*)"(.*)"(,?)\s*$/);
    if (!m) {
      out.push(line);
      continue;
    }
    const [, prefix, body, comma] = m;
    // Escapamos cada " ASCII no-escapada dentro del body.
    const fixed = body.replace(/(?<!\\)"/g, '\\"');
    out.push(`${prefix}"${fixed}"${comma}`);
  }
  return out.join("\n");
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Sin JSON en respuesta");
  const slice = raw.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (firstErr) {
    // Intento de reparación line-based para el caso típico de comillas
    // dobles ASCII no escapadas dentro de un value (ver prompt JSON SAFETY).
    try {
      return JSON.parse(repairJsonLineBased(slice));
    } catch {
      throw firstErr;
    }
  }
}

async function translateBatch(entries, targetLocale) {
  const localeLabel = LOCALE_LABEL[targetLocale] ?? targetLocale;
  const preserveList = PRESERVE_TERMS.map((t) => `"${t}"`).join(", ");

  const obj = Object.fromEntries(entries);

  const prompt = [
    `You are translating a UI catalog for an open-science web product called "Human Aging Simulators (HAS)" — a global, hopeful, donor-and-citizen-facing platform about extending healthy human lifespan.`,
    ``,
    `Translate the JSON values from Spanish (es) into ${localeLabel}.`,
    ``,
    `Strict rules:`,
    `- Output a single JSON object with the SAME KEYS as input. Translate only the string values.`,
    `- Keep tone hopeful, warm, inviting — match the source register.`,
    `- Preserve these terms verbatim, never translate them: ${preserveList}.`,
    `- Preserve interpolation placeholders like {year}, {count}, ICU plural syntax.`,
    `- Preserve emoji, em-dashes (—), middle dots (·), arrows (→) and HTML-like punctuation.`,
    `- Do not add or remove keys. Do not add commentary. Do not wrap in code fences.`,
    `- For RTL languages (ar), do not add markup — just translate.`,
    `- CRITICAL JSON SAFETY: inside string VALUES, do NOT use ANY of these characters: " (U+0022), „ (U+201E), " (U+201C), " (U+201D). If the source text quotes a UI element name like "Manage consents", do not include quotation marks in your translation — just write the name verbatim (e.g. German "diese unter Einwilligungen verwalten" without quotes). For dialogue or emphasis, use single quotes (' apostrophe U+0027) or guillemets «» (U+00AB / U+00BB) — but apostrophes and guillemets are also discouraged. The ONLY double quotes allowed in your output are the JSON delimiters around keys and around values.`,
    ``,
    `Input JSON:`,
    "```json",
    JSON.stringify(obj, null, 2),
    "```",
    ``,
    `Return only the translated JSON object.`,
  ].join("\n");

  // Retry hasta 3 veces si JSON.parse falla (típicamente comillas dobles
  // ASCII no escapadas en el cuerpo). Cada retry refuerza la regla de JSON.
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const messages = [{ role: "user", content: prompt }];
    if (attempt > 1) {
      messages.push({
        role: "user",
        content: `Your previous response was not valid JSON: ${lastErr?.message}. Reproduce the same translation but ensure no unescaped " characters appear inside string values — replace any such with the target language's typographic quotes (German „...", French «...», etc.).`,
      });
    }
    try {
      const text = await callClaude(messages);
      const translated = extractJson(text);
      for (const [k] of entries) {
        if (!(k in translated)) {
          console.warn(`  [warn] missing key in translation: ${k}`);
        }
      }
      return translated;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) process.stdout.write(`(retry ${attempt + 1}) `);
    }
  }
  throw lastErr;
}

// ---------- main ----------
const sourcePath = path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);
if (!fs.existsSync(sourcePath)) {
  console.error(`No existe ${sourcePath}`);
  process.exit(1);
}
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sourceFlat = flatten(source);

console.log(
  `Source: ${SOURCE_LOCALE} (${Object.keys(sourceFlat).length} keys)`,
);
console.log(`Targets: ${targets.join(", ")}`);
console.log(
  `Mode: ${onlyMissing ? "incremental" : "full"}${dryRun ? " (dry-run)" : ""}`,
);
console.log("");

for (const locale of targets) {
  if (locale === SOURCE_LOCALE) continue;

  const targetPath = path.join(MESSAGES_DIR, `${locale}.json`);
  let existing = null;
  let existingFlat = {};
  let isPlaceholder = false;
  if (fs.existsSync(targetPath)) {
    existing = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    existingFlat = flatten(existing);
    isPlaceholder = existing?.$meta?.placeholder === true;
  }

  const toTranslate = [];
  for (const [k, v] of Object.entries(sourceFlat)) {
    if (k.startsWith("$meta")) continue;
    if (onlyMissing && !isPlaceholder && existingFlat[k] !== undefined)
      continue;
    toTranslate.push([k, v]);
  }

  if (toTranslate.length === 0) {
    console.log(`[${locale}] sin cambios`);
    continue;
  }

  console.log(`[${locale}] traducir ${toTranslate.length} claves...`);
  if (dryRun) continue;

  const translatedFlat = {};
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    process.stdout.write(
      `  batch ${i / BATCH_SIZE + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)}... `,
    );
    const t = await translateBatch(batch, locale);
    Object.assign(translatedFlat, t);
    console.log("ok");
  }

  const mergedFlat = { ...existingFlat };
  for (const [k] of toTranslate) {
    if (translatedFlat[k] !== undefined) mergedFlat[k] = translatedFlat[k];
  }
  // Drop any $meta from merged before unflatten
  for (const k of Object.keys(mergedFlat)) {
    if (k.startsWith("$meta")) delete mergedFlat[k];
  }

  const result = unflatten(mergedFlat);
  result.$meta = {
    sourceLocale: SOURCE_LOCALE,
    translatedBy: `bedrock/${MODEL}`,
    translatedAt: new Date().toISOString(),
    needsHumanReview: true,
    placeholder: false,
  };

  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`[${locale}] escrito ${path.relative(ROOT, targetPath)}`);
}

console.log("\nListo.");
