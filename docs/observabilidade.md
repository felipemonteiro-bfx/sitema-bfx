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

## Falha de venda observavel (spec — 2026-08-18)

### Problema

Relato do cliente em 2026-08-14 07:04: "fui subir algumas vendas e ele nao contabilizou / na hora
de salvar so da erro e nao salva". Quatro dias depois o incidente ficou **indiagnosticavel**, e a
investigacao mostrou por que — nao por falta de log de infra, mas por falta de log de aplicacao:

- pod do app rodou o dia inteiro (cron de 15 em 15 min, sem reinicio);
- Postgres so registrou checkpoint de rotina, zero `ERROR`/`FATAL`;
- blackbox exporter: 288 sondas no dia, 0 falhas — mas ATENCAO, isso cobre so o caminho
  INTERNO: o CoreDNS do cluster tem `hosts` fixando `bfx.softlive.dev` no ClusterIP do
  Traefik, entao a sonda nunca sai do cluster. O caminho do cliente (Cloudflare ->
  `cloudflared` on-prem -> tailnet -> Traefik do VKE) segue sem cobertura;
- `logError("venda","criar_venda_falhou")` **nunca disparou**;
- `vendas_id_seq` sem buraco — nenhuma transacao chegou a abrir.

Ou seja: a tentativa foi **rejeitada antes do banco**, e nenhum dos caminhos de rejeicao deixa
rastro no servidor. Sao quatro:

1. validacao no cliente (`toast.error`) — nada;
2. validacao na action (`errorResponse`) — retorna **sem logar**;
3. falha de transporte da Server Action — `console.error` so no browser;
4. `401` em `/api/*` com sessao expirada (JWT de 7 dias, sem renovacao; o middleware so cobre
   `/api/*`, entao a pagina continua na tela enquanto as chamadas morrem).

O caso 4 tem um agravante: o autocomplete fazia `setClienteSuggestions(await res.json() || [])`
sem checar `res.ok`. O corpo do 401 (`{error:"Sessao invalida ou expirada."}`) entrava no estado
como se fosse lista, o cliente nunca podia ser selecionado, e o submit morria em "Preencha os
campos obrigatorios: Cliente" — erro na cara do usuario, silencio absoluto no servidor.

### O que muda

- `src/lib/venda-observabilidade.ts` — `registrarRejeicaoVenda({origem, motivo, ...})`, um ponto
  unico que emite `logEvent("venda","venda_rejeitada",...)`. Chamado em **todo** retorno de
  rejeicao anterior a transacao: `criarVendaV2` (5 pontos), `POST /api/importacao/batch`
  (2 pontos) e `criarVenda`. Esta ultima e a action legada e **nao tem chamador hoje**
  (`/venda-rapida` usa a V2) — instrumentar o `return` mudo dela e guarda de futuro, nao
  explicacao do incidente.
- `src/lib/resposta-autenticada.ts` — `lerListaDaResposta(res)`, que checa `res.ok`, distingue
  sessao expirada (401) de outras falhas e **nunca** deixa corpo de erro virar lista. Adotado nos
  `fetch` do formulario de venda rapida.

Motivo de os dois virarem modulo em `src/lib/`: o vitest roda em `environment: node` e so inclui
`src/__tests__/**/*.test.ts` — action e componente React nao sao executaveis no teste (mesma razao
de `src/lib/form-values.ts`). A logica testavel sai do call site; um teste-gate prova a adocao.

### Fora de escopo (decisao do Andre)

- Renovacao deslizante do JWT de 7 dias — e mudanca de politica de sessao.
- Estender o `matcher` do middleware para as paginas.
- Os demais `fetch` sem `res.ok` fora do fluxo de venda (~24 call sites).
- Sentry (bloqueado por `npm install`).
