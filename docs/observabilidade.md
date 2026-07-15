# Observabilidade

## Hoje (sem dependências externas)

Log estruturado JSON de uma linha via `src/lib/logger.ts`:

- `logCron(job, event, data)` / `logCronError(job, event, error, data)` — usado nas rotas de cron.
- `logEvent(scope, event, data)` — evento genérico.
- `logError(scope, event, error, data)` — erro genérico (inclui `stack`). Adotado no caminho
  crítico de venda (`criarVendaV2`), campanhas e crons.

Cada linha sai como JSON (`{ts, scope, level?, event, error?, ...}`), fácil de filtrar/consultar
em CloudWatch / stack de logs do K8s. Ex.: `kubectl logs deploy/bfx-app | grep '"level":"error"'`.

## Próximo passo (requer instalar dependência)

APM/error-tracking de verdade (Sentry) precisa de `@sentry/nextjs`, que **não pôde ser instalado
neste ambiente** (restrição de `npm install`). Quando puder instalar:

1. `yarn add @sentry/nextjs` e rodar `npx @sentry/wizard@latest -i nextjs`.
2. Encaminhar `logError` para o Sentry (é o ponto único): dentro de `logError`, além do
   `console.error`, chamar `Sentry.captureException(error, { tags: { scope }, extra: data })`.
3. Definir `SENTRY_DSN` nos secrets do K8s.

Assim o `logError` já espalhado pelo código passa a alimentar o Sentry sem mais refactor.
