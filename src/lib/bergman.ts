/**
 * Modelo mínimo de Bergman — versión client-side para la demo del simulador.
 *
 * Port en TypeScript del modelo del repositorio `has-simulator`
 * (`src/has_simulator/systems/_bergman.py`). Reproduce el lazo glucosa-insulina
 * acoplado de cuatro EDOs para que la demo del landing corra en el navegador,
 * sin backend. La integración usa Runge-Kutta de cuarto orden con paso fijo
 * —suficiente para una curva suave; el motor real usa `scipy.integrate`.
 *
 * No es un dispositivo médico ni una herramienta de diagnóstico (ver ADR-008).
 */

// --- parámetros universales del modelo (idénticos a metabolic.py) ------------
const GLUCOSE_EFFECTIVENESS = 0.025; // S_G  (min⁻¹)
const INSULIN_ACTION_DECAY = 0.025; // p_2  (min⁻¹)
const INSULIN_CLEARANCE = 0.14; // n    (min⁻¹)
const BETA_CELL_RESPONSE = 0.06; // gamma
const GUT_ABSORPTION = 0.035; // k_abs (min⁻¹)

/** Sensibilidad a la insulina de referencia (adulto joven sano). */
const INSULIN_SENSITIVITY_REF = 8.0e-4;
/** Glucosa-equivalente que aporta cada gramo de carbohidrato (mg/dL). */
const CARB_TO_GLUCOSE_MG_DL = 2.0;

/** Umbrales clínicos orientativos (mg/dL). */
export const HYPERGLYCEMIA_MG_DL = 200;
export const HYPOGLYCEMIA_MG_DL = 70;
/** Techo del rango sano postprandial, orientativo (mg/dL). */
export const HEALTHY_CEILING_MG_DL = 140;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Parámetros del individuo derivados de su edad. */
export interface GlucoseProfile {
  /** G_b — glucosa plasmática de ayuno (mg/dL). */
  fastingGlucose: number;
  /** I_b — insulina plasmática basal (µU/mL). */
  basalInsulin: number;
  /** S_I — sensibilidad a la insulina (mL·µU⁻¹·min⁻¹). */
  insulinSensitivity: number;
}

/**
 * Deriva el perfil glucémico de un individuo a partir de su edad. La
 * sensibilidad a la insulina declina ~0,5 %/año tras los 30; la glucosa y la
 * insulina de ayuno suben levemente con la edad.
 */
export function profileForAge(ageYears: number): GlucoseProfile {
  const aging = Math.max(0, ageYears - 30);
  const sensitivityFactor = clamp(1 - aging * 0.005, 0.35, 1.05);
  return {
    insulinSensitivity: INSULIN_SENSITIVITY_REF * sensitivityFactor,
    fastingGlucose: 88 + aging * 0.1,
    basalInsulin: 9 + aging * 0.03,
  };
}

interface State {
  g: number; // glucosa plasmática
  x: number; // acción insulínica remota
  i: number; // insulina plasmática
  d: number; // glucosa intestinal por absorber
}

function derivatives(s: State, p: GlucoseProfile): State {
  const appearance = GUT_ABSORPTION * s.d;
  const secreted = BETA_CELL_RESPONSE * Math.max(0, s.g - p.fastingGlucose);
  return {
    g:
      -(GLUCOSE_EFFECTIVENESS + s.x) * s.g +
      GLUCOSE_EFFECTIVENESS * p.fastingGlucose +
      appearance,
    x:
      -INSULIN_ACTION_DECAY * s.x +
      INSULIN_ACTION_DECAY * p.insulinSensitivity * (s.i - p.basalInsulin),
    i: -INSULIN_CLEARANCE * (s.i - p.basalInsulin) + secreted,
    d: -GUT_ABSORPTION * s.d,
  };
}

function step(s: State, p: GlucoseProfile, dt: number): State {
  const add = (a: State, b: State, scale: number): State => ({
    g: a.g + b.g * scale,
    x: a.x + b.x * scale,
    i: a.i + b.i * scale,
    d: a.d + b.d * scale,
  });
  const k1 = derivatives(s, p);
  const k2 = derivatives(add(s, k1, dt / 2), p);
  const k3 = derivatives(add(s, k2, dt / 2), p);
  const k4 = derivatives(add(s, k3, dt), p);
  return {
    g: s.g + (dt / 6) * (k1.g + 2 * k2.g + 2 * k3.g + k4.g),
    x: s.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    i: s.i + (dt / 6) * (k1.i + 2 * k2.i + 2 * k3.i + k4.i),
    d: s.d + (dt / 6) * (k1.d + 2 * k2.d + 2 * k3.d + k4.d),
  };
}

/** Un punto de la trayectoria glucémica. */
export interface GlucosePoint {
  /** Minuto-sim desde la comida. */
  minute: number;
  /** Glucosa plasmática (mg/dL). */
  glucose: number;
  /** Insulina plasmática (µU/mL). */
  insulin: number;
}

/** Resumen de una respuesta glucémica postprandial. */
export interface MealResponse {
  curve: GlucosePoint[];
  fastingGlucose: number;
  peakGlucose: number;
  peakMinute: number;
  crossesHyperglycemia: boolean;
}

/**
 * Simula la respuesta de glucosa a una comida: arranca en ayuno, carga el
 * compartimento intestinal con la comida y deja correr el modelo.
 */
export function simulateMeal(opts: {
  ageYears: number;
  carbsGrams: number;
  durationMin?: number;
}): MealResponse {
  const profile = profileForAge(opts.ageYears);
  const durationMin = opts.durationMin ?? 240;
  const dt = 0.5;
  const stepsPerMinute = Math.round(1 / dt);

  let state: State = {
    g: profile.fastingGlucose,
    x: 0,
    i: profile.basalInsulin,
    d: opts.carbsGrams * CARB_TO_GLUCOSE_MG_DL,
  };

  const curve: GlucosePoint[] = [
    { minute: 0, glucose: state.g, insulin: state.i },
  ];
  let peakGlucose = state.g;
  let peakMinute = 0;

  const totalSteps = Math.round(durationMin / dt);
  for (let n = 1; n <= totalSteps; n++) {
    state = step(state, profile, dt);
    if (state.g > peakGlucose) {
      peakGlucose = state.g;
      peakMinute = n * dt;
    }
    if (n % stepsPerMinute === 0) {
      curve.push({ minute: n * dt, glucose: state.g, insulin: state.i });
    }
  }

  return {
    curve,
    fastingGlucose: profile.fastingGlucose,
    peakGlucose,
    peakMinute,
    crossesHyperglycemia: peakGlucose > HYPERGLYCEMIA_MG_DL,
  };
}
