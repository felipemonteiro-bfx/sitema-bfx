/**
 * Log estruturado (JSON de uma linha) para jobs de cron e tarefas de background.
 * Facilita busca/observabilidade em ferramentas de log (K8s/CloudWatch).
 */

type LogData = Record<string, unknown>;

/** Emite um evento de cron como JSON de uma linha. */
export function logCron(job: string, event: string, data: LogData = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: "cron", job, event, ...data }));
}

/** Emite um erro de cron como JSON de uma linha (stderr). */
export function logCronError(job: string, event: string, error: unknown, data: LogData = {}): void {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: "cron",
      level: "error",
      job,
      event,
      error: error instanceof Error ? error.message : String(error),
      ...data,
    })
  );
}
