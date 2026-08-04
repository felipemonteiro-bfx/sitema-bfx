---
phase: 10-fundacao-visual
plan: 02
subsystem: infra
tags: [eslint, ci, github-actions, flat-config, lint, design-tokens]

# Dependency graph
requires:
  - phase: 10-fundacao-visual (plano 01)
    provides: "scripts/design-tokens/raw-color-scan.mjs (RAW_COLOR_PATTERN_SOURCE, scanPaths, readBaseline, compareToBaseline) e design-system/raw-color-baseline.json (299 ocorrencias, 22 arquivos, 1 excecao)"
provides:
  - "Regra ESLint inline bfx/no-raw-color: error em src/ geral, warn nos 22 arquivos legados, off na 1 excecao"
  - "CI com dois portoes independentes sem tolerancia a falha: step Lint (Camada A, nao verificavel nesta maquina) e step 'Cor crua (catraca)' rodando npm run cores:check (Camada B, verificada nesta maquina)"
  - "npm run cores:scan e npm run cores:check disponiveis para uso local e CI"
  - "4 sites de window.location.href = ... convertidos para window.location.assign(...), dívida de lint pré-existente quitada"
affects: [11-migracao-telas, 12-telas-financeiras, 13-migracao-telas, 14-migracao-telas]

actuals:
  tokens: 3000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Plugin ESLint inline em flat config (sem pacote): objeto literal { rules: { 'no-raw-color': { meta, create } } } passado direto em 'plugins'"
    - "Baseline JSON como fonte de verdade para severidade de lint por arquivo (error/warn/off derivados de design-system/raw-color-baseline.json via node:fs, nunca digitados a mao)"
    - "Dois portoes de CI independentes para a mesma regra de negocio: um em ESLint (nao verificavel localmente sem node_modules), outro em node puro (100% verificavel)"

key-files:
  created:
    - scripts/design-tokens/eslint-wiring.test.mjs
  modified:
    - eslint.config.mjs
    - package.json
    - .github/workflows/ci.yml
    - src/components/historico-antecipacoes.tsx
    - src/components/antecipacao-client.tsx
    - src/components/report-buttons-client.tsx

key-decisions:
  - "Regex do lint construida dentro de create() a cada arquivo (new RegExp(RAW_COLOR_PATTERN_SOURCE, 'g')), nunca compartilhada em escopo de modulo, para evitar estado de lastIndex vazando entre arquivos"
  - "Blocos legado/excecao do flat config nao redeclaram 'plugins: { bfx }' — o bloco geral (src/**/*.{ts,tsx}) ja registra o plugin para todo arquivo sob src/, os blocos seguintes so sobrescrevem a severidade da mesma regra"
  - "location.href = ... virou location.assign(...) nos 4 sites, mesma URL, sem eslint-disable — dívida real quitada, nao suprimida"

patterns-established:
  - "Baseline JSON dirigindo tanto a regra de ESLint (Camada A) quanto o script de CI em node puro (Camada B) a partir da mesma fonte de dados — nao ha lista de arquivos legados duplicada em dois lugares"

requirements-completed: [UI-03]

coverage:
  - id: D1
    description: "Regra ESLint bfx/no-raw-color como error em src/, warn nos 22 arquivos legados, off na 1 excecao — plugin inline, sem pacote novo"
    requirement: "UI-03"
    verification:
      - kind: unit
        ref: "scripts/design-tokens/eslint-wiring.test.mjs#eslint.config.mjs importa RAW_COLOR_PATTERN_SOURCE do scanner de cor crua (padrao unico)"
        status: pass
      - kind: unit
        ref: "scripts/design-tokens/eslint-wiring.test.mjs#lista de arquivos legados do baseline tem 22 entradas e excecoes tem 1"
        status: pass
    human_judgment: true
    rationale: "ESLint nao roda nesta maquina (sem node_modules) — a fiacao do config foi verificada por teste estatico (sintaxe, imports, contrato do plugin), mas ninguem rodou 'eslint src/' de fato para confirmar que a regra reporta em tempo de execucao. Precisa de humano/CI rodando com node_modules instalados para confirmar D1 na pratica."
  - id: D2
    description: "4 sites de window.location.href = ... convertidos para window.location.assign(...) nos 3 arquivos indicados, sem alterar URLs nem comportamento"
    requirement: "UI-03"
    verification:
      - kind: unit
        ref: "scripts/design-tokens/eslint-wiring.test.mjs#historico-antecipacoes.tsx, antecipacao-client.tsx e report-buttons-client.tsx nao atribuem direto a location.href"
        status: pass
      - kind: unit
        ref: "node scripts/design-tokens/raw-color-scan.mjs src --check"
        status: pass
    human_judgment: false
  - id: D3
    description: "CI com dois portoes reais sem tolerancia a falha: step Lint sem continue-on-error e step 'Cor crua (catraca)' rodando npm run cores:check, ambos capazes de derrubar o build"
    requirement: "UI-03"
    verification:
      - kind: unit
        ref: "node -e busca negativa por continue-on-error + presenca de npm run cores:check em .github/workflows/ci.yml (verify da task 3)"
        status: pass
      - kind: unit
        ref: "npm run cores:check (exit 0 no estado atual)"
        status: pass
      - kind: unit
        ref: "prova de catraca: baseline dopado (contagem -1) + --baseline-file=<tmp> sai exit 1"
        status: pass
    human_judgment: true
    rationale: "O step 'Lint' do workflow real (Camada A) so pode ser confirmado rodando o job no GitHub Actions com node_modules instalados — nao ha como executar 'actions/checkout' + 'npm ci' + 'npm run lint' nesta maquina. A Camada B (cores:check) foi provada localmente de ponta a ponta."

duration: ~15min
completed: 2026-08-03
status: complete
---

# Phase 10 Plan 02: Trava de lint (D-04) Summary

**Regra ESLint inline `bfx/no-raw-color` (error/warn/off por baseline, sem pacote novo) + CI com dois portões independentes sem tolerância a falha: o step de ESLint e um step próprio em Node puro rodando o scanner do plano 01 — mais os 4 sites de `location.href =` convertidos para `location.assign(...)`.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3/3
- **Files modified:** 7 (1 criado, 6 modificados)

## Accomplishments
- `eslint.config.mjs` ganhou um plugin ESLint inline (`bfx/no-raw-color`) — nenhum pacote instalado — em três camadas de severidade derivadas de `design-system/raw-color-baseline.json`: `error` para `src/**` em geral, `warn` para os 22 arquivos legados, `off` para a única exceção declarada.
- Os 4 sites pré-existentes de `window.location.href = ...` (que quebrariam o lint assim que ele virasse bloqueante) foram convertidos para `window.location.assign(...)`, sem alterar nenhuma URL nem usar `eslint-disable`.
- `.github/workflows/ci.yml` perdeu o `continue-on-error: true` do step `Lint` e ganhou um step novo, `Cor crua (catraca)`, rodando `npm run cores:check` — sem tolerância a falha, antes do `Generate Prisma Client`.
- `package.json` ganhou dois scripts (`cores:scan`, `cores:check`) e nenhuma dependência nova (`devDependencies` continua com 19 entradas).
- Provado nesta máquina que a catraca de fato morde: baseline dopado (uma contagem reduzida em 1) faz `raw-color-scan.mjs --check --baseline-file=<tmp>` sair com exit 1.

## Task Commits

Each task was committed atomically:

1. **Task 1: Regra de lint de cor crua no flat config (D-04)** - `dafded8` (feat, TDD: teste de fiação escrito antes do config)
2. **Task 2: Quitar a dívida de lint pré-existente (4 sites)** - `575816b` (fix, TDD: asserção estática acrescentada ao teste antes da troca)
3. **Task 3: CI com dois portões reais (D-04)** - `cc3f1c7` (feat)

_Nenhum commit de plan-metadata separado ainda — este SUMMARY e o commit final de metadados serão feitos na sequência._

## Files Created/Modified
- `eslint.config.mjs` - plugin inline `bfx/no-raw-color`, três blocos de severidade (error/warn/off) derivados do baseline
- `scripts/design-tokens/eslint-wiring.test.mjs` - teste de fiação: sintaxe, import do padrão único, leitura do baseline sem import attribute, contagem 22/1, existência em disco, ausência de atribuição direta a `location.href` nos 3 arquivos
- `package.json` - scripts `cores:scan` e `cores:check`
- `.github/workflows/ci.yml` - step `Lint` sem `continue-on-error`; novo step `Cor crua (catraca)` rodando `npm run cores:check`
- `src/components/historico-antecipacoes.tsx` - `location.href =` → `location.assign(...)` (linha 27)
- `src/components/antecipacao-client.tsx` - `location.href =` → `location.assign(...)` (linhas 168 e 192, únicas linhas tocadas — o resto do arquivo pertence à migração de cor crua da Fase 11)
- `src/components/report-buttons-client.tsx` - `location.href =` → `location.assign(...)` (linha 31)

## Decisions Made
- A regex de detecção é construída dentro de `create()` a cada visita de arquivo (`new RegExp(RAW_COLOR_PATTERN_SOURCE, "g")`), nunca em escopo compartilhado de módulo — evita qualquer risco de estado `lastIndex` vazando entre arquivos lintados na mesma execução.
- Os blocos de severidade `warn` (legado) e `off` (exceção) do flat config não redeclaram `plugins: { bfx }`: o bloco geral (`src/**/*.{ts,tsx}`) já casa com todo arquivo sob `src/` e registra o plugin; os blocos seguintes só sobrescrevem a severidade da mesma regra para o subconjunto de arquivos deles. Isso segue o comportamento de merge do flat config do ESLint (plugins se unem por arquivo casado, regras usam o último valor).
- Nenhum comentário explicativo foi deixado nas linhas de `location.assign(...)` citando a forma antiga — o teste de fiação faz busca negativa no texto e um comentário assim invalidaria a checagem (instrução explícita da task 2).

## Deviations from Plan

None - plan executado exatamente como escrito. As três tasks TDD seguiram RED→GREEN conforme especificado; o único ajuste foi reescrever o texto de um comentário JSDoc em `eslint.config.mjs` que continha acidentalmente a própria substring que o teste de fiação buscava negativamente (`with { type: ... }`) — corrigido inline durante o ciclo GREEN, sem mudança de comportamento.

## Issues Encountered

Nenhum bloqueador. O ambiente concorrente (executor 10-01/10-03) regravou `design-system/raw-color-baseline.json` (só o timestamp `generatedAt` mudou) enquanto este plano rodava — confirmado que a contagem (299 ocorrências, 22 arquivos, 1 exceção) permaneceu idêntica antes de prosseguir, então não houve impacto neste plano.

## O que NÃO foi verificado nesta máquina (registrar explicitamente)

- **Camada A (ESLint) não roda aqui.** Não há `node_modules` nesta máquina e `npm install` é proibido por CLAUDE.md. `node --check eslint.config.mjs` confirma sintaxe válida e o teste de fiação confirma o contrato de import/leitura de baseline, mas **ninguém executou `eslint src/` de fato**. Não afirmo que a regra reporta corretamente em runtime — isso só pode ser confirmado quando o CI rodar com dependências instaladas (ou quando alguém rodar localmente com `node_modules` presente).
- **Camada B (catraca em Node puro) foi verificada de ponta a ponta nesta máquina** — `npm run cores:check` sai 0 no estado atual, e a prova de regressão (baseline dopado → exit 1) foi executada e confirmada.
- O step `Lint` real do workflow (`.github/workflows/ci.yml`) só pode ser confirmado quando o job rodar no GitHub Actions — não há como simular `actions/checkout` + `npm ci` + `npm run lint` nesta máquina.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- A trava está instalada em duas camadas independentes: se a Camada A (ESLint) degradar por qualquer motivo, a Camada B (`cores:check` em Node puro) continua barrando regressão.
- As fases 11-14 podem migrar tela por tela: cada arquivo que sair da lista `legacyFiles` do baseline (ao rodar `--baseline` de novo após migrar) volta a ser `error` em vez de `warn` automaticamente, sem tocar em `eslint.config.mjs`.
- **Concern para o merge:** este plano rodou em paralelo com o executor 10-03 (dono de `design-system/DE-PARA-CORES.md` e `scripts/design-tokens/token-contrast.*`). Nenhum arquivo desses foi tocado aqui — mantive o escopo estritamente aos arquivos listados no cabeçalho do plano (`eslint.config.mjs`, `.github/workflows/ci.yml`, `package.json`, os 3 componentes com `location.href`).
- **Concern real:** a Camada A nunca foi provada em execução real de ESLint nesta máquina (ver seção acima). Recomendo que a primeira execução do CI após o merge deste plano seja observada — se a Camada A falhar por algum erro de fiação não pego pelo teste estático, a Camada B ainda segura a trava, mas o reforço da Camada A ficaria mudo até ser corrigido.

---
*Phase: 10-fundacao-visual*
*Completed: 2026-08-03*

## Self-Check: PASSED

All 8 files created/modified confirmed present on disk. All 3 task commits (`dafded8`, `575816b`, `cc3f1c7`) confirmed in git log.
