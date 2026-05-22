/**
 * has-simulator-dispatch — despachador de jobs del simulador.
 *
 * Disparado por la cola SQS `simulator-jobs`. Por cada mensaje (cuyo cuerpo es
 * el UUID de una corrida ya registrada en `simulator.runs`), lanza una tarea
 * Fargate one-shot del worker, pasándole el run-id como override de comando y
 * variable de entorno. La tarea corre la simulación, persiste vía el RDS Data
 * API y termina — despacho asíncrono scale-to-zero (R2.3c).
 *
 * `@aws-sdk/client-ecs` viene incluido en el runtime Node 20 de Lambda.
 */
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";

const ecs = new ECSClient({});

const CLUSTER = process.env.ECS_CLUSTER;
const TASK_DEFINITION = process.env.TASK_DEFINITION;
const SUBNETS = (process.env.SUBNETS ?? "").split(",").filter(Boolean);
const SECURITY_GROUP = process.env.SECURITY_GROUP;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handler = async (event) => {
  for (const record of event.Records ?? []) {
    const runId = (record.body ?? "").trim();
    if (!UUID_RE.test(runId)) {
      // Mensaje malformado: se descarta para que no bloquee la cola.
      console.error(`run-id inválido, mensaje descartado: ${runId}`);
      continue;
    }

    await ecs.send(
      new RunTaskCommand({
        cluster: CLUSTER,
        taskDefinition: TASK_DEFINITION,
        launchType: "FARGATE",
        count: 1,
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: SUBNETS,
            securityGroups: [SECURITY_GROUP],
            // IP pública: la tarea alcanza SQS/ECR/Data API por internet,
            // sin NAT Gateway (R2.3c — opción A).
            assignPublicIp: "ENABLED",
          },
        },
        overrides: {
          containerOverrides: [
            {
              name: "worker",
              command: ["worker", "--run-id", runId],
              environment: [{ name: "HAS_SIM_RUN_ID", value: runId }],
            },
          ],
        },
      }),
    );
    console.log(`tarea Fargate lanzada para la corrida ${runId}`);
  }

  return { dispatched: (event.Records ?? []).length };
};
