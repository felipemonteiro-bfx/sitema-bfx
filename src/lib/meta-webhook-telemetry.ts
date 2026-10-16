// Diagnóstico limitado ao processo atual. Nunca armazenar payloads ou chaves.
export type MetaWebhookOutcome = 'signature_rejected' | 'number_missing' | 'processed' | 'processing_failed';
type Event = { at: string; outcome: MetaWebhookOutcome; acceptedChanges: number; storedMessages: number };
type State = { startedAt: string; events: Event[] };
const runtime = globalThis as typeof globalThis & { bfxMetaWebhookTelemetry?: State };
function state(): State {
  return runtime.bfxMetaWebhookTelemetry ??= { startedAt: new Date().toISOString(), events: [] };
}
export function recordMetaWebhook(outcome: MetaWebhookOutcome, acceptedChanges = 0, storedMessages = 0) {
  const s = state();
  s.events.push({ at: new Date().toISOString(), outcome, acceptedChanges, storedMessages });
  s.events = s.events.slice(-20);
}
export function metaWebhookTelemetry() {
  const s = state();
  return { scope: 'current_process', startedAt: s.startedAt, events: [...s.events],
    note: 'Amostra dos últimos20POSTs nesteprocesso; reinicia nodeploy. Ausência não prova falta deentrega emoutroprocesso.' };
}
