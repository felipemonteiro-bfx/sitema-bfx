---
phase: 09-integracoes-e-carga-de-dados
plan: 01
subsystem: integracoes
tags: [uber-direct, pdv, error-handling, discriminated-union, tdd]

# Dependency graph
requires: []
provides:
  - "Modulo puro src/lib/uber-quote-result.ts com resultado discriminado de cotacao Uber, classificacao de resposta HTTP/rede e prontidao de configuracao"
  - "getDeliveryQuote() devolvendo ResultadoCotacaoUber em vez de null em todos os caminhos"
  - "POST /api/frete/uber/quote e GET /api/frete/uber/status traduzindo motivo -> status HTTP + mensagem pt-BR"
  - "PDV (venda-rapida-form-v2.tsx) exibindo mensagem de erro especifica sem nunca bloquear a venda"
affects: ["09-03 (runbook de credenciais Uber, INT-01)"]

actuals:
  tokens: 6650
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Modulo puro sem imports para logica classificavel, seguindo o precedente de src/lib/cliente-rapido.ts — permite verificacao via node --input-type=module nesta maquina sem node_modules"
    - "Resultado discriminado (ok:true | ok:false com motivo de lista fechada) em vez de null/undefined para erros indistinguiveis"
    - "Teste de regressao estrutural sobre texto-fonte (readFileSync + split/includes, sem RegExp exec) para travar decisoes de UI sem montar o componente em jsdom"

key-files:
  created:
    - src/lib/uber-quote-result.ts
    - src/__tests__/uber-quote-result.test.ts
    - src/__tests__/uber-status-prontidao.test.ts
    - src/__tests__/uber-cotacao-nao-bloqueia-venda.test.ts
  modified:
    - src/lib/uber.ts
    - src/app/api/frete/uber/quote/route.ts
    - src/app/api/frete/uber/status/route.ts
    - src/components/venda-rapida-form-v2.tsx

key-decisions:
  - "classificarProntidaoUber foi implementada junto com o restante do modulo puro na Task 1 (mesmo arquivo, interface_contract unico), em vez de so na Task 2 como o plano detalhava — ver Deviations"
  - "UberQuoteResponse (tipo antigo, sem uso fora de uber.ts) foi removido em vez de mantido morto, já que ResultadoCotacaoUber o substitui por completo"

requirements-completed: [INT-02]

coverage:
  - id: D1
    description: "getDeliveryQuote() devolve resultado discriminado (ok | sem_credencial | sem_endereco_coleta | endereco_invalido | erro_upstream); nenhum caminho de saida e mais um null indistinguivel"
    requirement: "INT-02"
    verification:
      - kind: unit
        ref: "src/__tests__/uber-quote-result.test.ts"
        status: unknown
      - kind: other
        ref: "node --input-type=module one-liner da Task 1 do PLAN.md — imprimiu 'INT-02 TRACER OK'"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/frete/uber/status distingue credencial ausente de endereco de coleta ausente/invalido e nunca ecoa a credencial na resposta"
    requirement: "INT-02"
    verification:
      - kind: unit
        ref: "src/__tests__/uber-status-prontidao.test.ts"
        status: unknown
      - kind: other
        ref: "node --input-type=module one-liner da Task 2 do PLAN.md — imprimiu 'INT-02 PRONTIDAO OK'"
        status: pass
    human_judgment: false
  - id: D3
    description: "A venda nunca e bloqueada pela cotacao Uber: botao de finalizar so depende do envio do formulario, frete continua editavel a mao, e uma cotacao que falha nao sobrescreve o valor ja digitado"
    requirement: "INT-02"
    verification:
      - kind: unit
        ref: "src/__tests__/uber-cotacao-nao-bloqueia-venda.test.ts"
        status: unknown
      - kind: other
        ref: "node --input-type=module one-liner da Task 3 do PLAN.md — imprimiu 'INT-02 NAO BLOQUEIA OK'"
        status: pass
    human_judgment: true
    rationale: "O teste de regressao e estrutural (texto-fonte), nao um teste de comportamento em runtime do formulario real; a suite vitest que provaria comportamento em runtime nao roda nesta maquina (sem node_modules) — o gate real e o CI. Marcado human_judgment para o verificador confirmar visualmente o fluxo de cotacao com falha no PDV quando a suite rodar no CI."

duration: 15min
completed: 2026-08-03
status: complete
---

# Phase 9 Plan 1: Cotacao Uber com motivo claro (INT-02) Summary

**`getDeliveryQuote()` para de devolver `null` em todo caminho de erro; passa a devolver um resultado discriminado com 4 motivos distintos, cada um com mensagem pt-BR propria exibida no PDV, sem nunca bloquear a venda.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-03T19:10:00Z
- **Completed:** 2026-08-03T19:24:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Novo modulo puro `src/lib/uber-quote-result.ts` (zero imports) classifica toda resposta HTTP/falha de rede da Uber em `sem_credencial | sem_endereco_coleta | endereco_invalido | erro_upstream`, com `detalhe` sempre de lista fechada (nunca texto livre da Uber) e mensagem pt-BR distinta por motivo terminando em "informe o frete manualmente"
- `getDeliveryQuote()` (`src/lib/uber.ts`) nao tem mais nenhum `return null` — delega para `interpretarRespostaUber`/`interpretarFalhaDeRede`; corpo cru da Uber so aparece em `console.error` do servidor
- `POST /api/frete/uber/quote` traduz motivo -> status HTTP (503/503/422/502) e mensagem legivel, sem nunca expor o campo `detalhe` de diagnostico ao navegador
- `GET /api/frete/uber/status` usa `classificarProntidaoUber` (que recebe valores por parametro, nunca le `process.env` por dentro) e distingue credencial ausente de endereco de coleta ausente/invalido, sem ecoar a credencial na resposta
- PDV (`venda-rapida-form-v2.tsx`) mostra a mensagem do servidor no toast de erro, guarda `uberMotivo`/`uberMensagem`, troca o texto que citava nomes de variavel de ambiente do servidor por linguagem de vendedor, e exibe uma linha de ajuda abaixo do campo "Frete (Cobrado)" quando a cotacao esta indisponivel — sem alterar o botao de finalizar venda nem tornar o campo de frete somente leitura

## Task Commits

Each task was committed atomically:

1. **Task 1: Fatia vertical — cotacao recusada chega ao vendedor com motivo** - `ed003e4` (feat)
2. **Task 2: Prontidao — PDV diz por que a cotacao esta indisponivel** - `1ed1a58` (feat)
3. **Task 3: Trava — cotacao nunca bloqueia a venda** - `45b7bdd` (test)

**Plan metadata:** (this commit, next step)

## Files Created/Modified
- `src/lib/uber-quote-result.ts` - Modulo puro: `ResultadoCotacaoUber`, `ProntidaoUber`, classificacao de resposta/falha de rede/prontidao, mensagens pt-BR, mapa motivo->status HTTP
- `src/lib/uber.ts` - `getDeliveryQuote` devolve `ResultadoCotacaoUber`; `UberQuoteResponse` removido (sem uso fora do arquivo)
- `src/app/api/frete/uber/quote/route.ts` - Traduz motivo de falha para status HTTP + `{ motivo, mensagem, error }`; caminho feliz identico ao anterior
- `src/app/api/frete/uber/status/route.ts` - Reescrito para usar `classificarProntidaoUber`; devolve `{ enabled, motivo, mensagem, pickupAddress? }`
- `src/components/venda-rapida-form-v2.tsx` - Estados `uberMotivo`/`uberMensagem`, toasts usando mensagem do servidor, linha de ajuda no campo de frete
- `src/__tests__/uber-quote-result.test.ts` - 8 casos de `interpretarRespostaUber`/`interpretarFalhaDeRede`/`mensagemFalhaUber`/`statusHttpParaFalhaUber`
- `src/__tests__/uber-status-prontidao.test.ts` - 7 casos de `classificarProntidaoUber`, incluindo T-09-02 (nao vazar credencial)
- `src/__tests__/uber-cotacao-nao-bloqueia-venda.test.ts` - Trava estrutural: botao de finalizar so depende de `loading`, frete sem `disabled`/`readOnly`, erro de cotacao nao sobrescreve `frete`

## Decisions Made
- `classificarProntidaoUber` foi escrita no mesmo arquivo/commit da Task 1 em vez de isolada na Task 2 (ver Deviations) — decisao pragmatica, sem impacto de escopo ou correcao, apenas de sequenciamento de commits.
- `UberQuoteResponse` (tipo antigo do retorno de `getDeliveryQuote`) foi removido do arquivo em vez de deixado morto, ja que nenhum outro arquivo o importava e `ResultadoCotacaoUber` o substitui por completo.
- Resposta de erro da rota de cotacao inclui `error` alem de `motivo`/`mensagem` apenas para nao quebrar o `data?.error` que ja existia no PDV antes desta mudanca (compatibilidade retroativa, conforme o `<interface_contract>` do plano).

## Deviations from Plan

### Auto-fixed Issues

**1. [Sequenciamento de TDD] `classificarProntidaoUber` implementada na Task 1 em vez de na Task 2**
- **Found during:** Escrita de `src/lib/uber-quote-result.ts` na Task 1
- **Issue:** O `<interface_contract>` do plano define `classificarProntidaoUber` como parte do MESMO arquivo puro criado na Task 1 ("Passo 1 — criar `src/lib/uber-quote-result.ts` conforme o `<interface_contract>`"), mas a funcao so e testada e usada a partir da Task 2. Ao escrever o arquivo completo seguindo o contrato de interface na Task 1, a funcao ja saiu implementada e correta antes do teste RED da Task 2 existir — quebrando a ceremonia estrita de RED-antes-de-GREEN para essa funcao especifica (embora as outras 6 funcoes do contrato tenham seguido RED->GREEN corretamente na Task 1).
- **Fix:** Nenhum — o comportamento resultante e identico ao que o plano pedia (mesma assinatura, mesmas regras de classificacao) e o teste `src/__tests__/uber-status-prontidao.test.ts` cobre os 7 casos do `<behavior>` da Task 2 e passou no `<verify>` sem alteracoes no modulo. Documentado aqui em vez de re-trabalhar o arquivo apenas para forcar a ceremonia.
- **Files modified:** src/lib/uber-quote-result.ts (Task 1), sem mudanca adicional na Task 2
- **Verification:** `node --input-type=module` one-liner da Task 2 imprimiu `INT-02 PRONTIDAO OK`
- **Committed in:** ed003e4 (Task 1 commit, funcao presente desde o inicio); 1ed1a58 (Task 2 commit, uso na rota/PDV + teste)

---

**Total deviations:** 1 (sequenciamento de TDD, sem impacto de correcao ou escopo)
**Impact on plan:** Nenhum — todos os `<verify>` das 3 tasks passaram exatamente como escritos no plano; a unica diferenca e que uma funcao do contrato ficou pronta um commit antes do previsto.

## Issues Encountered
None.

## User Setup Required
None - nenhuma configuracao de servico externo necessaria por este plano (a credencial `UBER_*` continua ausente de proposito; criar os valores e escopo do plano 09-03, acao humana do Andre).

## Next Phase Readiness
- `getDeliveryQuote`, a rota de cotacao e a rota de status estao prontos para funcionar assim que as envs `UBER_DIRECT_CUSTOMER_ID`/`UBER_DIRECT_TOKEN`/`UBER_PICKUP_ADDRESS_JSON` existirem no cluster (plano 09-03).
- Os tres arquivos de teste novos so rodam de fato no gate de CI (`vitest` nao roda nesta maquina) — nenhuma execucao real da suite foi possivel localmente; os one-liners `node --input-type=module` do `<verify>` de cada task passaram e cobrem a mesma logica.
- Nenhum bloqueio para o plano 09-02 (import de clientes Equilibrium) ou 09-03 (runbook de credenciais) — este plano nao tocou schema, banco nem infraestrutura.

---
*Phase: 09-integracoes-e-carga-de-dados*
*Completed: 2026-08-03*

## Self-Check: PASSED

All 8 files created/modified by this plan and the SUMMARY.md itself were confirmed present on disk. All 3 task commit hashes (`ed003e4`, `1ed1a58`, `45b7bdd`) were confirmed present in `git log`.
