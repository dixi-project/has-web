/**
 * has-demo-cleanup — purga periódica de cuentas demo viejas (Sprint 8 V2).
 *
 * Disparada por EventBridge cada 6h. Invoca el endpoint interno
 * `POST /api/internal/demo/cleanup` de has-admin, autenticado por shared
 * secret leído de SSM Parameter Store (mismo path que omop-etl-sync) con
 * cache en módulo.
 *
 * El endpoint admin borra users `demo-%@haslife.org` con
 * `created_at > TTL_HOURS` (default 24h en el service).
 */

import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ENDPOINT = process.env.CLEANUP_ENDPOINT;
const SECRET_PARAM = process.env.HAS_INTERNAL_SECRET_PARAM;
const TTL_HOURS = process.env.CLEANUP_TTL_HOURS ?? "24";
const LIMIT = process.env.CLEANUP_LIMIT ?? "100";
const REGION = process.env.AWS_REGION ?? "us-east-1";

const ssm = new SSMClient({ region: REGION });
let cachedSecret = null;
let cachedExpiresAt = 0;
const TTL_MS = 60 * 60 * 1000; // 1h cache del secret

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
  if (!ENDPOINT) throw new Error("CLEANUP_ENDPOINT no configurado");

  const secret = await getSecret();
  const url = `${ENDPOINT}?ttl_hours=${TTL_HOURS}&limit=${LIMIT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-has-internal-secret": secret },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `cleanup failed status=${res.status} body=${text.slice(0, 500)}`,
    );
  }
  const stats = JSON.parse(text);
  console.log(JSON.stringify({ message: "demo_cleanup_completed", ...stats }));
  return stats;
};
