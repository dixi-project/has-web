"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
};

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

function loadRecaptcha(siteKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  const existing = document.querySelector(
    `script[data-recaptcha="${siteKey}"]`,
  );
  if (existing) {
    return new Promise((resolve) =>
      existing.addEventListener("load", () => resolve()),
    );
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    s.async = true;
    s.defer = true;
    s.dataset.recaptcha = siteKey;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("recaptcha script failed to load"));
    document.head.appendChild(s);
  });
}

async function getRecaptchaToken(): Promise<string | null> {
  if (!RECAPTCHA_SITE_KEY) return null;
  try {
    await loadRecaptcha(RECAPTCHA_SITE_KEY);
    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha?.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY!, {
            action: "contact",
          });
          resolve(token);
        } catch (err) {
          reject(err);
        }
      });
    });
  } catch {
    return null;
  }
}

export function ContactForm({ locale }: Props) {
  const t = useTranslations("ContactForm");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_CONTACT_API_URL ||
    (process.env.NEXT_PUBLIC_DONATION_API_URL
      ? process.env.NEXT_PUBLIC_DONATION_API_URL.replace(
          /\/donate$/,
          "/contact",
        )
      : undefined);

  useEffect(() => {
    if (RECAPTCHA_SITE_KEY) loadRecaptcha(RECAPTCHA_SITE_KEY).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError(t("errorName"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError(t("errorEmail"));
    if (description.trim().length < 5) return setError(t("errorDescription"));
    if (!apiUrl) return setError(t("errorMisconfigured"));

    setSubmitting(true);
    try {
      const recaptchaToken = await getRecaptchaToken();
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          description: description.trim(),
          recaptchaToken,
          locale,
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as {
            message?: string;
            error?: string;
          };
          if (body?.message) detail = `: ${body.message}`;
          if (body?.error === "invalid_captcha") {
            setError(t("errorCaptcha"));
            setSubmitting(false);
            return;
          }
        } catch {
          /* ignore */
        }
        setError(`${t("errorGeneric")}${detail}`);
        setSubmitting(false);
        return;
      }

      setDone(true);
      setSubmitting(false);
    } catch {
      setError(t("errorNetwork"));
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center dark:border-emerald-800/40 dark:bg-emerald-950/30">
        <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-300">
          {t("successEyebrow")}
        </p>
        <h3 className="mt-3 text-2xl font-semibold">{t("successTitle")}</h3>
        <p className="mt-4 text-zinc-700 dark:text-zinc-300">
          {t("successMessage")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-zinc-950"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-semibold">
            {t("nameLabel")} <span className="text-rose-500">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-base outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-900"
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-semibold"
          >
            {t("emailLabel")} <span className="text-rose-500">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-base outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-900"
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="contact-phone"
            className="block text-sm font-semibold"
          >
            {t("phoneLabel")}{" "}
            <span className="text-xs font-normal text-zinc-500">
              {t("optional")}
            </span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-base outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-900"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
          />
        </div>

        <div>
          <label
            htmlFor="contact-description"
            className="block text-sm font-semibold"
          >
            {t("descriptionLabel")} <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="contact-description"
            required
            minLength={5}
            maxLength={3000}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-900"
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-foreground text-background mt-6 inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? t("processing") : t("submit")}
      </button>

      <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {RECAPTCHA_SITE_KEY ? t("recaptchaNotice") : t("privacyNotice")}
      </p>
    </form>
  );
}
