import Stripe from "stripe";
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
// Whitelist alineada con has-web/src/lib/currency.ts.
// Stripe convierte a USD en settlement de la cuenta nonprofit.
const SUPPORTED_CURRENCIES = new Set([
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
]);
// Currencies "zero-decimal" en Stripe: el unit_amount es la cantidad entera, no en centavos.
// Ver: https://stripe.com/docs/currencies#zero-decimal
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);
const SUPPORTED_RECURRENCE = new Set(["once", "monthly"]);

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50000;

const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://haslife.org";
const PRODUCT_NAME = "Donation to Human Aging Simulators";
const PRODUCT_DESCRIPTION =
  "Funds open longevity infrastructure: genomics, multi-omics models, audited storage and open data.";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const sesRegion = process.env.SES_REGION || "us-east-1";
const fromAddress = process.env.FROM_ADDRESS || "donations@haslife.org";
const adminEmail = process.env.ADMIN_EMAIL || "acastillejos@dixi-project.com";
const sesConfigurationSet = process.env.SES_CONFIGURATION_SET || undefined;

if (!stripeKey) {
  console.error("STRIPE_SECRET_KEY is not set");
}
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" })
  : null;
const ses = new SESv2Client({ region: sesRegion });

const STRIPE_LOCALE_MAP = {
  es: "es",
  en: "en",
  pt: "pt-BR",
  fr: "fr",
  it: "it",
  de: "de",
  ru: "ru",
  ja: "ja",
  zh: "zh",
  hi: "auto",
  ar: "auto",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function validate(input) {
  if (!input || typeof input !== "object") {
    return { error: "internal_error", message: "missing body" };
  }
  const { amount, currency, recurring, locale } = input;

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return { error: "invalid_amount", message: "amount must be a number" };
  }
  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return {
      error: "invalid_amount",
      message: `amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}`,
    };
  }
  if (
    typeof currency !== "string" ||
    !SUPPORTED_CURRENCIES.has(currency.toLowerCase())
  ) {
    return { error: "invalid_currency", message: "currency not supported" };
  }
  if (typeof recurring !== "string" || !SUPPORTED_RECURRENCE.has(recurring)) {
    return {
      error: "invalid_recurring",
      message: "recurring must be 'once' or 'monthly'",
    };
  }
  if (typeof locale !== "string" || !SUPPORTED_LOCALES.has(locale)) {
    return { error: "invalid_locale", message: "locale not supported" };
  }
  return null;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function notifyAdminOfDonation(session) {
  const amount = (session.amount_total ?? 0) / 100;
  const currency = (session.currency || "usd").toUpperCase();
  const mode = session.mode;
  const customerEmail =
    session.customer_details?.email || session.customer_email || "(no email)";
  const customerName = session.customer_details?.name || "(anonymous)";
  const country = session.customer_details?.address?.country || "?";
  const sessionId = session.id;
  const dashboardUrl = `https://dashboard.stripe.com/payments/${session.payment_intent || sessionId}`;

  const subject = `💚 Nueva donación: ${currency} ${amount} · ${customerName}`;
  const text = `Nueva donación recibida en haslife.org

Monto: ${currency} ${amount} (${mode === "subscription" ? "RECURRENTE mensual" : "una vez"})
Donante: ${customerName}
Email: ${customerEmail}
País: ${country}

Stripe session: ${sessionId}
Ver en dashboard: ${dashboardUrl}
`;
  const html = `<html><body style="font-family:system-ui,sans-serif;line-height:1.5;max-width:560px">
<h2 style="color:#059669">💚 Nueva donación</h2>
<table cellpadding="6" style="font-size:15px">
  <tr><td><strong>Monto</strong></td><td><strong>${currency} ${amount}</strong> ${mode === "subscription" ? "(<em>recurrente mensual</em>)" : "(una vez)"}</td></tr>
  <tr><td><strong>Donante</strong></td><td>${escapeHtml(customerName)}</td></tr>
  <tr><td><strong>Email</strong></td><td>${escapeHtml(customerEmail)}</td></tr>
  <tr><td><strong>País</strong></td><td>${escapeHtml(country)}</td></tr>
  <tr><td><strong>Session ID</strong></td><td><code style="font-size:12px">${escapeHtml(sessionId)}</code></td></tr>
</table>
<p style="margin-top:24px"><a href="${escapeHtml(dashboardUrl)}" style="background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Ver en Stripe Dashboard</a></p>
</body></html>`;

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: `Human Aging Simulators <${fromAddress}>`,
      Destination: { ToAddresses: [adminEmail] },
      ReplyToAddresses: [adminEmail],
      ConfigurationSetName: sesConfigurationSet,
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: { Data: text, Charset: "UTF-8" },
          },
        },
      },
    }),
  );
}

async function handleWebhook(event) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return jsonResponse(500, {
      error: "internal_error",
      message: "webhook secret not configured",
    });
  }
  if (!stripe) {
    return jsonResponse(500, {
      error: "internal_error",
      message: "stripe not configured",
    });
  }

  const sig =
    event.headers?.["stripe-signature"] || event.headers?.["Stripe-Signature"];
  if (!sig) {
    return jsonResponse(400, {
      error: "invalid_signature",
      message: "missing Stripe-Signature header",
    });
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("invalid webhook signature", err?.message);
    return jsonResponse(400, {
      error: "invalid_signature",
      message: "signature verification failed",
    });
  }

  console.log("stripe event", { id: stripeEvent.id, type: stripeEvent.type });

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      await notifyAdminOfDonation(stripeEvent.data.object);
    } else if (stripeEvent.type === "invoice.paid") {
      // Renovación mensual de suscripción — disparamos notificación similar.
      const invoice = stripeEvent.data.object;
      // Sintetizamos un objeto session-like para reusar la plantilla.
      const fakeSession = {
        id: invoice.id,
        amount_total: invoice.amount_paid,
        currency: invoice.currency,
        mode: "subscription",
        customer_email: invoice.customer_email,
        customer_details: {
          name: invoice.customer_name,
          email: invoice.customer_email,
          address: {},
        },
        payment_intent: invoice.payment_intent,
      };
      await notifyAdminOfDonation(fakeSession);
    }
    // Otros eventos suscritos (invoice.payment_failed, customer.subscription.deleted, etc.)
    // se acusan recibo con 200 sin acción de email — los procesará transparency-page.
  } catch (err) {
    console.error("webhook processing error", {
      name: err?.name,
      message: err?.message,
    });
    // Devuelve 500 para que Stripe reintente.
    return jsonResponse(500, {
      error: "internal_error",
      message: "could not process event",
    });
  }

  return jsonResponse(200, { received: true });
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod;
  const path = event?.requestContext?.http?.path || event?.rawPath || "";

  if (method === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }
  if (method !== "POST") {
    return jsonResponse(405, {
      error: "internal_error",
      message: "method not allowed",
    });
  }

  // Webhook de Stripe vive en la misma Lambda bajo /webhook.
  if (path.endsWith("/webhook")) {
    return handleWebhook(event);
  }

  if (!stripe) {
    return jsonResponse(500, {
      error: "internal_error",
      message: "stripe not configured",
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

  const { amount, recurring, locale } = input;
  const currency = String(input.currency).toLowerCase();
  // Stripe espera "centavos" para la mayoría de monedas, pero unidades enteras
  // para zero-decimal currencies (JPY, KRW, CLP, etc.).
  const unitAmount = ZERO_DECIMAL_CURRENCIES.has(currency)
    ? Math.round(amount)
    : Math.round(amount * 100);
  const stripeLocale = STRIPE_LOCALE_MAP[locale] || "auto";

  const successUrl = `${SITE_ORIGIN}/${locale}/thanks/?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${SITE_ORIGIN}/${locale}/cancel/`;

  try {
    const sessionParams = {
      mode: recurring === "monthly" ? "subscription" : "payment",
      submit_type: recurring === "monthly" ? undefined : "donate",
      locale: stripeLocale,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_creation: recurring === "monthly" ? undefined : "if_required",
      automatic_tax: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: PRODUCT_NAME,
              description: PRODUCT_DESCRIPTION,
            },
            ...(recurring === "monthly"
              ? { recurring: { interval: "month" } }
              : {}),
          },
        },
      ],
      metadata: {
        source: "has-web",
        locale,
        recurring,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse(200, { url: session.url, session_id: session.id });
  } catch (err) {
    console.error("stripe error", {
      type: err?.type,
      code: err?.code,
      message: err?.message,
    });
    return jsonResponse(500, {
      error: "stripe_error",
      message: err?.message || "stripe session creation failed",
    });
  }
};
