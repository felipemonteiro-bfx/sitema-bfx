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
  logError("cron", event, error, { job, ...data });
}

/** Evento estruturado genérico (JSON de uma linha). */
export function logEvent(scope: string, event: string, data: LogData = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope, event, ...data }));
}

/**
 * Erro estruturado genérico (stderr, JSON de uma linha).
 * Ponto único para plugar um APM (Sentry, etc.) no futuro — ver docs/observabilidade.md.
 */
export function logError(scope: string, event: string, error: unknown, data: LogData = {}): void {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope,
      level: "error",
      event,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
    })
  );
}
