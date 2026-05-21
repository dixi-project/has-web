/**
 * Cognito PostConfirmation trigger — has-admin.
 *
 * Se invoca tras un signup exitoso (después de confirmar el email con el
 * código). Inserta el usuario en la tabla `users` de la database
 * `has_platform` vía RDS Data API.
 *
 * Idempotente: si el `cognito_sub` ya existe, no hace nada.
 *
 * Env requeridas:
 *   HAS_DB_CLUSTER_ARN
 *   HAS_DB_SECRET_ARN
 *   HAS_DB_NAME=has_platform
 */
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";

const rds = new RDSDataClient({});

const CLUSTER_ARN = process.env.HAS_DB_CLUSTER_ARN;
const SECRET_ARN = process.env.HAS_DB_SECRET_ARN;
const DATABASE = process.env.HAS_DB_NAME ?? "has_platform";

const SQL_INSERT_USER = `
  INSERT INTO users (cognito_sub, email, name, role, locale, metadata)
  VALUES (:sub::uuid, :email, :name, :role, :locale, :metadata::jsonb)
  ON CONFLICT (cognito_sub) DO NOTHING
`;

export const handler = async (event) => {
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
    return event;
  }

  const attrs = event.request?.userAttributes ?? {};
  const sub = attrs.sub;
  const email = (attrs.email ?? "").toLowerCase();
  const name = attrs.name ?? email.split("@")[0];
  const role = attrs["custom:role"] ?? "citizen";
  const locale = attrs.locale ?? "es";

  if (!sub || !email) {
    console.error("PostConfirmation sin sub o email — saltando");
    return event;
  }

  try {
    await rds.send(
      new ExecuteStatementCommand({
        resourceArn: CLUSTER_ARN,
        secretArn: SECRET_ARN,
        database: DATABASE,
        sql: SQL_INSERT_USER,
        parameters: [
          { name: "sub", value: { stringValue: sub } },
          { name: "email", value: { stringValue: email } },
          { name: "name", value: { stringValue: name } },
          { name: "role", value: { stringValue: role } },
          { name: "locale", value: { stringValue: locale } },
          {
            name: "metadata",
            value: {
              stringValue: JSON.stringify({
                source: "cognito-post-confirmation",
                cognito_user_pool_id: event.userPoolId,
              }),
            },
          },
        ],
      }),
    );
    console.log(`✓ Usuario insertado: sub=${sub} email=${email}`);
  } catch (err) {
    // No bloqueamos el signup si falla la sincronización con Postgres
    // (mejor reconciliar después que dejar al usuario sin acceso).
    console.error("Error insertando usuario en Postgres:", err);
  }

  return event;
};
