import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const SUPPORTED_LOCALES = new Set([
  "es",
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
]);

const SES_REGION = process.env.SES_REGION || "us-east-1";
const FROM_ADDRESS = process.env.FROM_ADDRESS || "contact@haslife.org";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "acastillejos@dixi-project.com";
const SES_CONFIGURATION_SET = process.env.SES_CONFIGURATION_SET || undefined;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
const RECAPTCHA_MIN_SCORE = Number.parseFloat(
  process.env.RECAPTCHA_MIN_SCORE || "0.5",
);

const ses = new SESv2Client({ region: SES_REGION });

const TRANSLATIONS = {
  es: {
    adminSubject: "Nuevo contacto desde haslife.org",
    userSubject: "Gracias por escribirnos — Human Aging Simulators",
    userBody: (name) => `Hola ${name},

Gracias por escribirnos. Recibimos tu mensaje y te contestaremos en cuanto podamos.

Mientras tanto, puedes seguir el avance del proyecto en https://haslife.org.

Equipo Human Aging Simulators
`,
  },
  en: {
    adminSubject: "New contact from haslife.org",
    userSubject: "Thanks for reaching out — Human Aging Simulators",
    userBody: (name) => `Hi ${name},

Thanks for writing. We received your message and will get back to you as soon as we can.

In the meantime, follow the project progress at https://haslife.org.

The Human Aging Simulators team
`,
  },
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function validate(input) {
  if (!input || typeof input !== "object") {
    return { error: "internal_error", message: "missing body" };
  }
  const { name, email, phone, description, recaptchaToken, locale } = input;

  if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
    return { error: "invalid_name", message: "name required (2-120 chars)" };
  }
  if (typeof email !== "string" || !isEmail(email) || email.length > 254) {
    return {
      error: "invalid_email",
      message: "email is required and must be valid",
    };
  }
  if (phone !== undefined && phone !== null && typeof phone !== "string") {
    return { error: "invalid_phone", message: "phone must be a string" };
  }
  if (typeof phone === "string" && phone.length > 40) {
    return { error: "invalid_phone", message: "phone too long" };
  }
  if (
    typeof description !== "string" ||
    description.trim().length < 5 ||
    description.length > 3000
  ) {
    return {
      error: "invalid_description",
      message: "description required (5-3000 chars)",
    };
  }
  if (
    RECAPTCHA_SECRET &&
    (typeof recaptchaToken !== "string" || recaptchaToken.length === 0)
  ) {
    return { error: "invalid_captcha", message: "captcha token missing" };
  }
  if (typeof locale !== "string" || !SUPPORTED_LOCALES.has(locale)) {
    return { error: "invalid_locale", message: "locale not supported" };
  }
  return null;
}

async function verifyRecaptcha(token, remoteIp) {
  if (!RECAPTCHA_SECRET) {
    console.warn("RECAPTCHA_SECRET not set — skipping captcha validation");
    return { ok: true, score: 1 };
  }
  const params = new URLSearchParams({
    secret: RECAPTCHA_SECRET,
    response: token,
  });
  if (remoteIp) params.set("remoteip", remoteIp);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    return { ok: false, reason: "recaptcha_network", score: 0 };
  }
  const data = await res.json();
  if (!data.success) {
    return {
      ok: false,
      reason: "recaptcha_rejected",
      errors: data["error-codes"],
      score: 0,
    };
  }
  if (typeof data.score === "number" && data.score < RECAPTCHA_MIN_SCORE) {
    return { ok: false, reason: "recaptcha_low_score", score: data.score };
  }
  return { ok: true, score: data.score, action: data.action };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function adminEmail({
  name,
  email,
  phone,
  description,
  locale,
  score,
  remoteIp,
}) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "");
  const safeDescription = escapeHtml(description);
  const safeLocale = escapeHtml(locale);
  const safeScore = typeof score === "number" ? score.toFixed(2) : "n/a";
  const safeIp = escapeHtml(remoteIp || "n/a");

  return {
    html: `<html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<h2>Nuevo contacto desde haslife.org</h2>
<table cellpadding="6">
  <tr><td><strong>Nombre</strong></td><td>${safeName}</td></tr>
  <tr><td><strong>Email</strong></td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
  <tr><td><strong>Teléfono</strong></td><td>${safePhone || "<em>no proporcionado</em>"}</td></tr>
  <tr><td><strong>Idioma</strong></td><td>${safeLocale}</td></tr>
  <tr><td><strong>IP</strong></td><td>${safeIp}</td></tr>
  <tr><td><strong>reCAPTCHA score</strong></td><td>${safeScore}</td></tr>
</table>
<h3>Mensaje</h3>
<pre style="white-space:pre-wrap;font-family:inherit;background:#f6f6f6;padding:12px;border-radius:8px">${safeDescription}</pre>
</body></html>`,
    text: `Nuevo contacto desde haslife.org

Nombre: ${name}
Email: ${email}
Teléfono: ${phone || "(no proporcionado)"}
Idioma: ${locale}
IP: ${remoteIp || "n/a"}
reCAPTCHA score: ${safeScore}

Mensaje:
${description}
`,
  };
}

function userEmail({ name, locale }) {
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;
  const text = t.userBody(name);
  const html = `<html><body style="font-family:system-ui,sans-serif;line-height:1.6;max-width:560px">
<pre style="white-space:pre-wrap;font-family:inherit;font-size:15px">${escapeHtml(text)}</pre>
</body></html>`;
  return { subject: t.userSubject, html, text };
}

async function sendSes({ to, replyTo, subject, html, text }) {
  const cmd = new SendEmailCommand({
    FromEmailAddress: `Human Aging Simulators <${FROM_ADDRESS}>`,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    ConfigurationSetName: SES_CONFIGURATION_SET,
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    },
  });
  return ses.send(cmd);
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod;

  if (method === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }
  if (method !== "POST") {
    return jsonResponse(405, {
      error: "internal_error",
      message: "method not allowed",
    });
  }

  let input;
  try {
    input =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return jsonResponse(400, {
      error: "internal_error",
      message: "invalid json",
    });
  }

  const validationError = validate(input);
  if (validationError) {
    return jsonResponse(400, validationError);
  }

  const remoteIp = event?.requestContext?.http?.sourceIp;

  const captcha = await verifyRecaptcha(input.recaptchaToken, remoteIp);
  if (!captcha.ok) {
    console.warn("captcha failed", captcha);
    return jsonResponse(400, {
      error: "invalid_captcha",
      message: captcha.reason || "captcha rejected",
    });
  }

  const { name, email, phone, description, locale } = input;

  try {
    const admin = adminEmail({
      name,
      email,
      phone,
      description,
      locale,
      score: captcha.score,
      remoteIp,
    });
    await sendSes({
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `[haslife.org] ${name} — ${description.slice(0, 60).replace(/\s+/g, " ")}`,
      html: admin.html,
      text: admin.text,
    });
  } catch (err) {
    console.error("admin email failed", {
      name: err?.name,
      message: err?.message,
    });
    return jsonResponse(500, {
      error: "internal_error",
      message: "could not send admin notification",
    });
  }

  let userEmailSent = false;
  try {
    const u = userEmail({ name, locale });
    await sendSes({
      to: email,
      replyTo: ADMIN_EMAIL,
      subject: u.subject,
      html: u.html,
      text: u.text,
    });
    userEmailSent = true;
  } catch (err) {
    // El admin SÍ recibió la notificación — la falta del agradecimiento no es crítica.
    console.warn("user thank-you email failed", {
      name: err?.name,
      message: err?.message,
    });
  }

  return jsonResponse(200, { success: true, userEmailSent });
};
