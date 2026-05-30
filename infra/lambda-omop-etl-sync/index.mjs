/**
 * has-omop-etl-sync — job de recuperación del ETL FHIR -> OMOP (S7.4-extended).
 *
 * Disparada por EventBridge cada 5 minutos. Invoca el endpoint interno
 * `POST /api/internal/omop/sync-pending` de has-admin, autenticado por shared
 * secret leído de SSM Parameter Store (SecureString) al boot con cache.
 *
 * Cero secrets en env vars (2026-05-30: migrado desde env directa). El SSM
 * parameter sobrevive a `terraform apply` completo, las Lambdas siempre lo
 * encuentran.
 */

import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ENDPOINT = process.env.SYNC_ENDPOINT;
const SECRET_PARAM = process.env.HAS_INTERNAL_SECRET_PARAM;
const LIMIT = Number(process.env.SYNC_LIMIT ?? "100");
const REGION = process.env.AWS_REGION ?? "us-east-1";

const ssm = new SSMClient({ region: REGION });
let cachedSecret = null;
let cachedExpiresAt = 0;
const TTL_MS = 60 * 60 * 1000; // 1h

async function getSecret() {
  const now = Date.now();
  if (cachedSecret && cachedExpiresAt > now) return cachedSecret;
  if (!SECRET_PARAM)
    throw new Error("HAS_INTERNAL_SECRET_PARAM no configurado");
  const res = await ssm.send(
    new GetParameterCommand({ Name: SECRET_PARAM, WithDecryption: true }),
  );
  const value = res.Parameter?.Value;
  if (!value) throw new Error(`SSM param ${SECRET_PARAM} sin valor`);
  cachedSecret = value;
  cachedExpiresAt = now + TTL_MS;
  return value;
}

export const handler = async () => {
  if (!ENDPOINT) throw new Error("SYNC_ENDPOINT no configurado");

  const secret = await getSecret();
  const url = `${ENDPOINT}?limit=${LIMIT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-has-internal-secret": secret },
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
