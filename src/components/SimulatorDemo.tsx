"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  HEALTHY_CEILING_MG_DL,
  HYPERGLYCEMIA_MG_DL,
  simulateMeal,
} from "@/lib/bergman";

// Geometría del gráfico SVG (unidades de viewBox).
const W = 520;
const H = 300;
const PAD = { top: 20, right: 20, bottom: 44, left: 48 };
const DURATION_MIN = 240;
const Y_MIN = 60;

export function SimulatorDemo() {
  const t = useTranslations("Simulator");
  const [carbs, setCarbs] = useState(60);
  const [age, setAge] = useState(35);

  const response = useMemo(
    () =>
      simulateMeal({
        ageYears: age,
        carbsGrams: carbs,
        durationMin: DURATION_MIN,
      }),
    [age, carbs],
  );

  const yMax = Math.max(220, Math.ceil((response.peakGlucose + 20) / 20) * 20);
  const xPlot = W - PAD.left - PAD.right;
  const yPlot = H - PAD.top - PAD.bottom;

  const xScale = (minute: number) => PAD.left + (minute / DURATION_MIN) * xPlot;
  const yScale = (glucose: number) =>
    PAD.top + yPlot - ((glucose - Y_MIN) / (yMax - Y_MIN)) * yPlot;

  const linePoints = response.curve
    .map(
      (p) => `${xScale(p.minute).toFixed(1)},${yScale(p.glucose).toFixed(1)}`,
    )
    .join(" ");

  const areaPoints =
    `${xScale(0).toFixed(1)},${yScale(Y_MIN).toFixed(1)} ` +
    linePoints +
    ` ${xScale(DURATION_MIN).toFixed(1)},${yScale(Y_MIN).toFixed(1)}`;

  const status: "healthy" | "elevated" | "hyper" =
    response.peakGlucose > HYPERGLYCEMIA_MG_DL
      ? "hyper"
      : response.peakGlucose > HEALTHY_CEILING_MG_DL
        ? "elevated"
        : "healthy";

  const statusColor = {
    healthy: "text-emerald-700 dark:text-emerald-400",
    elevated: "text-amber-600 dark:text-amber-400",
    hyper: "text-rose-600 dark:text-rose-400",
  }[status];

  const xTicks = [0, 60, 120, 180, 240];
  const yTicks: number[] = [];
  for (let v = 80; v <= yMax; v += 40) yTicks.push(v);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* Controles */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="carbs" className="text-sm font-medium">
                {t("demo.carbsLabel")}
              </label>
              <span className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {carbs} {t("demo.carbsUnit")}
              </span>
            </div>
            <input
              id="carbs"
              type="range"
              min={0}
              max={150}
              step={5}
              value={carbs}
              onChange={(e) => setCarbs(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-600"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="age" className="text-sm font-medium">
                {t("demo.ageLabel")}
              </label>
              <span className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {age} {t("demo.ageUnit")}
              </span>
            </div>
            <input
              id="age"
              type="range"
              min={20}
              max={80}
              step={1}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-600"
            />
          </div>

          <dl className="grid grid-cols-2 gap-3 border-t border-zinc-200 pt-5 text-sm dark:border-zinc-800">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t("demo.fasting")}
              </dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold">
                {Math.round(response.fastingGlucose)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t("demo.peak")}
              </dt>
              <dd
                className={`mt-0.5 font-mono text-lg font-semibold ${statusColor}`}
              >
                {Math.round(response.peakGlucose)}
              </dd>
            </div>
          </dl>

          <p className={`text-sm font-medium ${statusColor}`}>
            {t(`demo.status.${status}`, {
              minute: Math.round(response.peakMinute),
            })}
          </p>
        </div>

        {/* Gráfico */}
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={t("demo.chartAlt")}
          >
            {/* Banda de rango sano (ayuno → techo sano) */}
            <rect
              x={PAD.left}
              y={yScale(HEALTHY_CEILING_MG_DL)}
              width={xPlot}
              height={yScale(Y_MIN) - yScale(HEALTHY_CEILING_MG_DL)}
              className="fill-emerald-100/70 dark:fill-emerald-900/30"
            />
            {/* Umbral de hiperglucemia */}
            {HYPERGLYCEMIA_MG_DL <= yMax && (
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yScale(HYPERGLYCEMIA_MG_DL)}
                y2={yScale(HYPERGLYCEMIA_MG_DL)}
                className="stroke-rose-400/70"
                strokeDasharray="4 4"
              />
            )}
            {/* Rejilla + ejes Y */}
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={yScale(v)}
                  y2={yScale(v)}
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                />
                <text
                  x={PAD.left - 8}
                  y={yScale(v) + 4}
                  textAnchor="end"
                  className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
                >
                  {v}
                </text>
              </g>
            ))}
            {/* Ejes X */}
            {xTicks.map((m) => (
              <text
                key={m}
                x={xScale(m)}
                y={H - PAD.bottom + 18}
                textAnchor="middle"
                className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
              >
                {m}
              </text>
            ))}
            {/* Área + curva de glucosa */}
            <polygon
              points={areaPoints}
              className="fill-emerald-500/15 dark:fill-emerald-400/10"
            />
            <polyline
              points={linePoints}
              fill="none"
              className="stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {/* Etiquetas de ejes */}
            <text
              x={PAD.left + xPlot / 2}
              y={H - 6}
              textAnchor="middle"
              className="fill-zinc-600 text-[11px] font-medium dark:fill-zinc-300"
            >
              {t("demo.axisTime")}
            </text>
            <text
              x={14}
              y={PAD.top + yPlot / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${PAD.top + yPlot / 2})`}
              className="fill-zinc-600 text-[11px] font-medium dark:fill-zinc-300"
            >
              {t("demo.axisGlucose")}
            </text>
          </svg>
          <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t("demo.legend")}
          </p>
        </div>
      </div>
    </div>
  );
}
