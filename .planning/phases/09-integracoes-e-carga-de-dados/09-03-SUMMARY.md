---
phase: 09-integracoes-e-carga-de-dados
plan: 03
subsystem: infra
tags: [uber-direct, ssm, external-secrets, runbook, vitest, tdd, documentation]

# Dependency graph
requires:
  - phase: 09-01
    provides: "getDeliveryQuote()/GET /api/frete/uber/status devolvendo motivo discriminado (sem_credencial, sem_endereco_coleta, endereco_invalido, erro_upstream) em vez de null/enabled:false generico"
provides:
  - "Runbook `## Uber Direct (cotacao de frete)` em deploy/bfx/README.md: as 3 chaves a acrescentar em bfx-app-secrets, por que nenhum manifesto muda, comando de force-sync e tabela motivo -> significado"
  - "Bloco Uber Direct do .env.example documentando que em producao os valores vem do AWS SSM via bfx-app-secrets, no mesmo padrao do MinIO"
  - "src/__tests__/uber-credenciais-runbook.test.ts: trava de CI contra deriva entre codigo/.env.example/runbook para as 3 envs UBER_*"
affects: []

actuals:
  tokens: 2007
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Teste de documentacao viva (readFileSync + .split()/.includes(), nunca RegExp.exec) travando deriva entre codigo e docs — mesma tecnica de src/__tests__/tokens-fundo-neutro.test.ts"
    - "Acao humana fora do alcance do agente (aws/kubectl/argocd) coletada integralmente em '## Acoes humanas pendentes' na SUMMARY, no formato ja estabelecido em 05-04-SUMMARY.md"

key-files:
  created:
    - src/__tests__/uber-credenciais-runbook.test.ts
  modified:
    - deploy/bfx/README.md
    - .env.example

key-decisions:
  - "Task 2 (checkpoint:human-verify, gate=blocking) nao foi executada nem auto-aprovada, apesar de qualquer workflow.auto_advave configurado — a restricao explicita desta execucao (nunca aws/kubectl/argocd) se sobrepoe, porque o agente fisicamente nao pode realizar o que o checkpoint verificaria"

patterns-established: []

requirements-completed: []
# INT-01 permanece [ ] em REQUIREMENTS.md: o codigo/documentacao estao prontos, mas o
# criterio da fase (cotacao preenche o frete em producao) so fecha depois que o Andre
# criar as credenciais no SSM e confirmar os passos 4/5/6 da Task 2 (ver "Acoes humanas
# pendentes" abaixo). Marcar aqui seria mentir sobre o estado real da integracao.

coverage:
  - id: D1
    description: "Runbook em deploy/bfx/README.md documenta as 3 envs UBER_*, o parametro do SSM, o force-sync e a prova de sucesso verificavel (/api/frete/uber/status)"
    requirement: "INT-01"
    verification:
      - kind: other
        ref: "node --input-type=module one-liner da Task 1 do PLAN.md — imprimiu 'INT-01 RUNBOOK OK'"
        status: pass
      - kind: unit
        ref: "src/__tests__/uber-credenciais-runbook.test.ts"
        status: unknown
    human_judgment: true
    rationale: "vitest nao roda nesta maquina (sem node_modules, npm install proibido). O one-liner node --input-type=module reproduz o mesmo algoritmo do teste e passou contra os arquivos reais; a suite vitest completa so roda no CI (.github/workflows/ci.yml)."
  - id: D2
    description: "Nenhum valor de credencial commitado no runbook ou no .env.example (T-09-14) — so placeholders entre < e >"
    requirement: "INT-01"
    verification:
      - kind: other
        ref: "grep manual das linhas UBER_DIRECT_TOKEN/UBER_DIRECT_CUSTOMER_ID em deploy/bfx/README.md — ambas com valor placeholder entre aspas angulares"
        status: pass
      - kind: unit
        ref: "src/__tests__/uber-credenciais-runbook.test.ts#T-09-14: nenhuma linha do runbook que cite as chaves de credencial carrega valor literal"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente (vitest so roda no CI). O grep manual e a leitura direta do diff confirmam que so ha placeholders."
  - id: D3
    description: "Credenciais reais criadas no SSM, ExternalSecret re-sincronizado e cotacao Uber funcionando ponta a ponta em producao (criterio 1 da fase, INT-01)"
    requirement: "INT-01"
    verification: []
    human_judgment: true
    rationale: "Requer aws ssm put-parameter, kubectl annotate externalsecret e conferencia manual no PDV em producao — todos proibidos para este agente pela restricao explicita desta execucao. Task 2 do plano e checkpoint:human-verify (gate=blocking) e permanece pendente; ver 'Acoes humanas pendentes' abaixo."

duration: 12min
completed: 2026-08-03
status: complete
---

# Phase 9 Plan 3: Runbook de credenciais Uber Direct (INT-01) Summary

**`deploy/bfx/README.md` ganha o runbook completo das 3 envs `UBER_*` (SSM, force-sync, prova de sucesso), o `.env.example` aponta para o SSM no mesmo padrao do MinIO, e um teste trava a deriva entre codigo e documentacao — a criacao das credenciais em si fica registrada como acao humana pendente, nao executada por este agente.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-03 (apos 09-01 e 09-02 completos)
- **Completed:** 2026-08-03
- **Tasks:** 1 executavel pelo agente (Task 2 e checkpoint humano, ver abaixo)
- **Files modified:** 3 (2 modificados, 1 criado)

## Accomplishments

- `deploy/bfx/README.md` ganhou a secao `## Uber Direct (cotacao de frete)`, no mesmo formato da secao do MinIO: estado atual (integracao nunca funcionou porque `bfx-app-secrets` nao tem chave `UBER_*`), o JSON com as 3 chaves a acrescentar (`UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_TOKEN`, `UBER_PICKUP_ADDRESS_JSON`, todas com placeholder entre `<` e `>`), por que nenhum manifesto YAML precisa mudar (`dataFrom.extract` + `envFrom.secretRef`), o comando de `force-sync` e uma tabela `motivo -> significado` para diagnostico rapido.
- `.env.example` (bloco Uber Direct, ja existente) ganhou a frase de que em producao os valores vem do AWS SSM via `bfx-app-secrets`, replicando a mesma linguagem ja usada no bloco MinIO.
- `src/__tests__/uber-credenciais-runbook.test.ts` (novo, TDD) trava a deriva entre `src/lib/uber.ts` + `src/app/api/frete/uber/status/route.ts` (codigo), `.env.example` e `deploy/bfx/README.md` para as 3 envs — renomear uma delas no codigo sem atualizar a documentacao quebra o CI. Tambem trava T-09-14 (nenhum valor literal de credencial no runbook).
- **Task 2 (checkpoint bloqueante) nao foi executada**: criar as credenciais no SSM, sincronizar o ExternalSecret e confirmar a cotacao em producao sao proibidos para este agente. Coletado integralmente abaixo em `## Acoes humanas pendentes`.

## Task Commits

Each task was committed atomically (ciclo TDD completo: RED -> GREEN):

1. **Task 1 (RED): trava de deriva falhando antes do runbook existir** - `50d5966` (test)
2. **Task 1 (GREEN): runbook + .env.example** - `3a002da` (docs)

**Plan metadata:** (this commit, next step)

_Nota: Task 2 (`checkpoint:human-verify`, `gate="blocking"`) nao foi executada por este agente — envolve criar credenciais reais no dashboard da Uber, editar o parametro SSM `bfx-app-secrets` e rodar `kubectl annotate` no cluster real, todos proibidos pelas restricoes explicitas deste plano e desta execucao. Ver "Acoes humanas pendentes" abaixo para o runbook completo que o Andre precisa seguir._

## Files Created/Modified

- `deploy/bfx/README.md` - Nova secao `## Uber Direct (cotacao de frete)`: estado atual, chaves a acrescentar em `bfx-app-secrets`, por que nenhum manifesto muda, comando de `force-sync`, tabela motivo -> significado
- `.env.example` - Bloco Uber Direct ganhou a frase "em producao vem do AWS SSM via bfx-app-secrets", igual ao bloco MinIO
- `src/__tests__/uber-credenciais-runbook.test.ts` - 7 casos: as 3 envs no `.env.example`, as 3 no runbook, as 3 no codigo (trava de deriva), runbook nomeia SSM/force-sync/prova de sucesso, nenhum valor literal de credencial (T-09-14), `.env.example` cita SSM/`bfx-app-secrets`, o proprio teste cobre as 3 envs

## Decisions Made

- Nenhuma decisao nova de arquitetura. Este plano segue o padrao ja fechado pela Fase 5 (`05-04-SUMMARY.md`) para acao humana pendente e reusa a tecnica de teste de documentacao viva ja usada em `tokens-fundo-neutro.test.ts`.
- Task 2 tratada exatamente como o plano instruiu: coletada como runbook na SUMMARY, nunca executada nem auto-aprovada — mesmo que `workflow.auto_advance=true` estivesse configurado, a restricao explicita desta execucao (proibicao de `aws`/`kubectl`/`argocd`) se sobrepoe, porque o agente fisicamente nao pode realizar o que o checkpoint verificaria.

## Deviations from Plan

None - plano executado exatamente como escrito na Task 1 (RED -> GREEN -> verify one-liner passou com `INT-01 RUNBOOK OK`). Task 2 seguiu a instrucao explicita de nao ser executada nem auto-aprovada.

## Issues Encountered

- Confirmado (como as SUMMARYs anteriores de fases 5 e 9 ja antecipavam): `npx vitest run` nao roda nesta maquina (`Cannot find module 'vitest/config'` — Yarn PnP sem `node_modules`, `npm install` proibido pelo `CLAUDE.md`). O teste novo foi escrito seguindo TDD (RED confirmado com o mesmo one-liner do `<verify>` antes das mudancas em `deploy/bfx/README.md`/`.env.example`, GREEN confirmado depois) e fica como gate do CI (`.github/workflows/ci.yml`).

## Known Stubs

Nenhum. Este plano so alterou documentacao e adicionou um teste; nao introduziu nenhum caminho de dados novo em UI ou API.

## User Setup Required

Ver "Acoes humanas pendentes" abaixo — esta e a unica pendencia externa deste plano, e ela e o que falta para INT-01 virar verdade em producao.

## Ações humanas pendentes

Nenhum destes comandos foi executado por este agente. Sao proibidos pelas restricoes explicitas desta execucao (nunca `aws`, `kubectl`, `argocd`, nem escrita em banco). O André precisa executa-los, nesta ordem, para fechar INT-01.

**Pre-requisito:** os commits das Fases 5-9 no branch `nextjs-migration` com o CI verde (`.github/workflows/ci.yml` -> `npx vitest run`). Se o CI estiver vermelho, parar aqui — as suites desta fase nunca rodaram localmente (sem `node_modules`); o CI e o unico gate automatico real.

### 1. Obter as credenciais na Uber

No dashboard da Uber Direct, pegar o Customer ID e gerar/obter o API token da conta da BFX.

### 2. Acrescentar as 3 chaves ao JSON do parametro SSM ja existente

Regiao `sa-east-1`, SecureString, parametro `/softlive/bfx/prod/secrets/bfx-app-secrets` — **acrescentar, nunca substituir**, o parametro ja tem 17 chaves em uso:

```json
{
  "UBER_DIRECT_CUSTOMER_ID": "<customer-id-da-uber>",
  "UBER_DIRECT_TOKEN": "<token-da-uber>",
  "UBER_PICKUP_ADDRESS_JSON": "{\"street_address\":[\"<rua e numero da loja>\"],\"city\":\"<cidade>\",\"state\":\"<UF>\",\"zip_code\":\"<cep so digitos>\",\"country\":\"BR\"}"
}
```

**O que prova sucesso:** o parametro salva sem erro de sintaxe JSON e as 17 chaves antigas continuam la.

### 3. Forcar o re-sync (senao espera ate 1h)

```bash
kubectl annotate externalsecret bfx-app-secrets -n bfx force-sync=$(date +%s) --overwrite
```

**O que prova sucesso:** `kubectl -n bfx get externalsecret bfx-app-secrets` em `SecretSynced`, e o pod `bfx-app` reiniciado sozinho pelo Reloader (`kubectl -n bfx get pods` mostrando idade nova).

### 4. Conferir a prontidao pela propria aplicacao (nao precisa de kubectl)

Logado no sistema, abrir `https://bfx.softlive.dev/api/frete/uber/status`.

**O que prova sucesso:** o JSON responde `{"enabled":true, ...}` com o `pickupAddress` preenchido. Se vier `{"enabled":false,"motivo":"sem_credencial"}`, o Secret nao chegou no pod (voltar ao passo 3). Se vier `{"enabled":false,"motivo":"sem_endereco_coleta"}`, o JSON de `UBER_PICKUP_ADDRESS_JSON` esta ausente ou malformado (voltar ao passo 2).

### 5. Cotar de verdade no PDV

Abrir `https://bfx.softlive.dev/venda-rapida`, selecionar um cliente **que tenha endereco e CEP cadastrados**, adicionar um produto e clicar no botao "Uber" ao lado do campo Frete.

**O que prova sucesso (INT-01, criterio 1 da fase):** o campo "Frete (Cobrado)" e preenchido com o valor cotado e aparece o toast com valor e tempo estimado.

### 6. Conferir a degradacao (INT-02, criterio 2 da fase, ja entregue no plano 09-01)

Com um cliente **sem** endereco cadastrado, clicar no botao "Uber".

**O que prova sucesso:** aparece uma mensagem dizendo o motivo, o campo de frete continua editavel a mao e a venda pode ser finalizada normalmente.

---

**Se qualquer passo falhar:** descrever o que aconteceu (incluindo o `motivo` que a rota de status devolveu) em vez de aprovar.

## Next Phase Readiness

- Codigo e documentacao para INT-01 estao completos: runbook reproduzivel sem consultar ninguem, `.env.example` alinhado, trava de CI contra deriva de nomes de env.
- INT-01 permanece pendente ate o runbook acima ser executado pelo Andre — o criterio 1 da fase (cotacao preenche o frete em producao) so fecha apos os passos 4, 5 e 6 confirmados.
- Nenhum bloqueador tecnico para fases seguintes: este plano so tocou documentacao e um teste, nao schema nem infraestrutura.
- Fase 9 (`09-integracoes-e-carga-de-dados`) fica com INT-02 e INT-03 tecnicamente completos (planos 09-01 e 09-02) e INT-01 aguardando so a acao humana registrada acima.

---
*Phase: 09-integracoes-e-carga-de-dados*
*Completed: 2026-08-03*

## Self-Check: PASSED

Os 3 arquivos de codigo/documentacao (2 modificados, 1 criado) e o proprio SUMMARY.md foram confirmados presentes no filesystem; os 2 hashes de commit (`50d5966`, `3a002da`) foram confirmados presentes em `git log --oneline --all`.
