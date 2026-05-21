"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  detectCurrency,
  formatCurrency,
  currencySymbol,
  PRESETS_BY_CURRENCY,
  type SupportedCurrency,
} from "@/lib/currency";

type Recurring = "once" | "monthly";

type Props = {
  locale: string;
};

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50000;

export function DonateForm({ locale }: Props) {
  const t = useTranslations("DonateForm");

  // Empezamos con USD como SSR-safe default; al hidratar detectamos divisa del navegador.
  const [currency, setCurrency] = useState<SupportedCurrency>("usd");
  const [presets, setPresets] = useState<readonly [number, number, number]>(
    PRESETS_BY_CURRENCY.usd,
  );
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(
    PRESETS_BY_CURRENCY.usd[1],
  );
  const [customAmount, setCustomAmount] = useState<string>("");
  const [recurring, setRecurring] = useState<Recurring>("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_DONATION_API_URL;

  useEffect(() => {
    const detected = detectCurrency(locale);
    if (detected !== currency) {
      const newPresets = PRESETS_BY_CURRENCY[detected];
      // navigator.language solo existe tras hidratar: el setState dentro del
      // effect es intencional (sincronizacion con un sistema externo).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrency(detected);
      setPresets(newPresets);
      setSelectedPreset(newPresets[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const symbol = useMemo(
    () => currencySymbol(currency, locale),
    [currency, locale],
  );

  function resolveAmount(): number | null {
    if (selectedPreset !== "custom") return selectedPreset;
    const parsed = Number.parseFloat(customAmount.replace(",", "."));
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amount = resolveAmount();
    if (amount === null) {
      setError(t("errorInvalid"));
      return;
    }
    if (amount < MIN_AMOUNT) {
      setError(t("errorMin"));
      return;
    }
    if (amount > MAX_AMOUNT) {
      setError(t("errorMax"));
      return;
    }

    if (!apiUrl) {
      setError(t("errorMisconfigured"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          recurring,
          locale,
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) detail = `: ${body.message}`;
        } catch {
          /* ignore */
        }
        setError(`${t("errorGeneric")}${detail}`);
        setSubmitting(false);
        return;
      }

      const body = (await res.json()) as { url?: string };
      if (!body.url) {
        setError(t("errorGeneric"));
        setSubmitting(false);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError(t("errorNetwork"));
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-zinc-950"
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {t("frequency")}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(["monthly", "once"] as const).map((opt) => {
            const active = recurring === opt;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => setRecurring(opt)}
                className={`h-11 rounded-full text-sm font-semibold transition ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-black/10 bg-white text-zinc-700 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10"
                }`}
                aria-pressed={active}
              >
                {t(opt === "monthly" ? "monthly" : "once")}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8 space-y-3">
        <legend className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {t("chooseAmount")}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((amt) => {
            const active = selectedPreset === amt;
            return (
              <button
                type="button"
                key={amt}
                onClick={() => setSelectedPreset(amt)}
                className={`h-14 rounded-2xl text-base font-semibold transition ${
                  active
                    ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                    : "border border-black/10 bg-white text-zinc-800 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-white/10"
                }`}
                aria-pressed={active}
              >
                {formatCurrency(amt, currency, locale)}
              </button>
            );
          })}
        </div>
        <div
          className={`mt-3 flex items-center gap-2 rounded-2xl border px-4 py-3 transition ${
            selectedPreset === "custom"
              ? "border-emerald-500"
              : "border-black/10 dark:border-white/15"
          }`}
        >
          <span className="text-zinc-500 dark:text-zinc-400" aria-hidden>
            {symbol}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step="1"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setSelectedPreset("custom");
            }}
            onFocus={() => setSelectedPreset("custom")}
            placeholder={t("customPlaceholder")}
            className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            aria-label={t("customAmountLabel")}
          />
          <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            {currency.toUpperCase()}
          </span>
        </div>
      </fieldset>

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
        {t("securedBy")}
      </p>
    </form>
  );
}
