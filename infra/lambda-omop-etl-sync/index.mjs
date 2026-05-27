/**
 * has-omop-etl-sync — job de recuperación del ETL FHIR -> OMOP (S7.4-extended).
 *
 * Disparada por EventBridge cada 5 minutos. Invoca el endpoint interno
 * `POST /api/internal/omop/sync-pending` de has-admin, autenticado por shared
 * secret. El endpoint procesa los `fhir_resources` sin `omop_synced_at` y los
 * proyecta a OMOP.
 *
 * Sólo hay un actor que conoce el secret (esta Lambda); la admin-server expone
 * el endpoint pero rechaza requests sin el header válido.
 */

const ENDPOINT = process.env.SYNC_ENDPOINT;
const SECRET = process.env.HAS_INTERNAL_SECRET;
const LIMIT = Number(process.env.SYNC_LIMIT ?? "100");

export const handler = async () => {
  if (!ENDPOINT || !SECRET) {
    const missing = [
      !ENDPOINT && "SYNC_ENDPOINT",
      !SECRET && "HAS_INTERNAL_SECRET",
    ].filter(Boolean);
    throw new Error(`env vars faltantes: ${missing.join(", ")}`);
  }

  const url = `${ENDPOINT}?limit=${LIMIT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-has-internal-secret": SECRET },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `sync failed status=${res.status} body=${text.slice(0, 500)}`,
    );
  }
  const stats = JSON.parse(text);
  console.log(JSON.stringify({ message: "omop_sync_completed", ...stats }));
  return stats;
};
