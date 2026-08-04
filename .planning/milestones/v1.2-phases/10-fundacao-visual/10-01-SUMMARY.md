---
phase: 10-fundacao-visual
plan: 01
subsystem: testing
tags: [tailwind, design-tokens, node-test, eslint-groundwork, static-analysis]

# Dependency graph
requires: []
provides:
  - "scanText/scanPaths: contador puro de classes Tailwind com escala numérica de cor em src/"
  - "RAW_COLOR_PATTERN_SOURCE: fonte única do padrão de detecção, consumível por outros contextos (ex.: regra de ESLint via esquery)"
  - "CLI --baseline/--check/--baseline-file: catraca que falha (exit 1) quando um arquivo regride"
  - "design-system/raw-color-baseline.json: marco zero (299 ocorrências, 22 arquivos) que as fases 11-14 têm que zerar"
affects: [10-02-eslint-rule, 11-telas-de-operacao, 12-telas-financeiras, 13-telas-de-dados-e-ia, 14-fechamento]

actuals:
  tokens: 6024
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "String.split() com regex global + grupos captura para extrair ocorrências com índice, evitando RegExp.exec()+lastIndex (bloqueado por hook de segurança do projeto)"
    - "Baseline JSON versionado como catraca de regressão: contagem só pode cair, nunca subir"

key-files:
  created:
    - scripts/design-tokens/raw-color-scan.mjs
    - scripts/design-tokens/raw-color-scan.test.mjs
    - design-system/raw-color-baseline.json
  modified: []

key-decisions:
  - "Baseline exclui src/app/api/relatorios/catalogo/route.ts (única exceção do projeto — HTML autônomo com Tailwind via CDN, fora do pipeline de tokens); D-04 previa 'nenhuma exceção', o inventário revelou esta"
  - "O número real de cor crua em src/ é 313 ocorrências em 23 arquivos (299/22 depois de excluir a exceção) — não 250/18 como constava na medição inicial do milestone; a medição inicial usava um grep restrito a bg-/text-/border- e ignorava .ts, perdendo 13 dos 16 prefixos utilitários que o plano exige (ring, from, to, via, fill, stroke, divide, outline, decoration, placeholder, shadow, accent, caret) e 2 arquivos .ts"

patterns-established:
  - "Pattern: detector de regressão como CLI (--baseline grava marco zero, --check falha exit 1 em regressão) reusável por outros contadores de dívida técnica"

requirements-completed: []
# UI-01/UI-03 estão na frontmatter do PLAN.md mas NAO sao marcados completos aqui:
# UI-01 ("Nenhuma cor Tailwind crua em src/") so fecha quando as fases 11-14 zerarem
# o baseline; UI-03 ("Existe regra de lint que barra cor crua") e entregue no plano 02.
# Este plano constroi a infraestrutura (detector + baseline) que ambos dependem.
# REQUIREMENTS.md nao foi tocado para evitar checkbox falso.

coverage:
  - id: D1
    description: "scanText casa todos os 16 prefixos utilitários Tailwind com escala numérica (50-950), incluindo variantes (hover:, dark:, data-[state=open]:) e opacidade (/20), e rejeita tokens semânticos (bg-background, text-muted-foreground) e utilitários não-cor (duration-500, z-50)"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "scripts/design-tokens/raw-color-scan.test.mjs#scanText matches every raw-color utility prefix listed in the plan"
        status: pass
      - kind: unit
        ref: "scripts/design-tokens/raw-color-scan.test.mjs#scanText does NOT match semantic tokens and unrelated numeric utilities"
        status: pass
    human_judgment: false
  - id: D2
    description: "scanPaths varre .ts/.tsx recursivamente em src/, ignorando node_modules/.next/generated, de forma determinística"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "scripts/design-tokens/raw-color-scan.test.mjs#scanPaths walks .ts/.tsx recursively, ignoring node_modules/.next/src/generated"
        status: pass
      - kind: unit
        ref: "scripts/design-tokens/raw-color-scan.test.mjs#scanPaths is deterministic across repeated runs on the same tree"
        status: pass
    human_judgment: false
  - id: D3
    description: "CLI --check falha com exit 1 quando um arquivo regride em relação ao baseline versionado (catraca), provado por fixture com baseline dopado"
    requirement: UI-03
    verification:
      - kind: unit
        ref: "scripts/design-tokens/raw-color-scan.test.mjs#compareToBaseline: fixture with a doctored baseline (count lowered by 1) reports ok:false and names the file"
        status: pass
      - kind: unit
        ref: "scripts/design-tokens/raw-color-scan.test.mjs#CLI --check exits 1 when a file regresses past the baseline"
        status: pass
    human_judgment: false
  - id: D4
    description: "design-system/raw-color-baseline.json versionado com o marco zero real do projeto (299 ocorrências, 22 arquivos, 1 exceção declarada)"
    requirement: UI-01
    verification:
      - kind: other
        ref: "node scripts/design-tokens/raw-color-scan.mjs src --check (exit 0, saldo 0)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-08-03
status: complete
---

# Phase 10 Plan 01: Detector de cor crua Summary

**Módulo Node puro (scanText/scanPaths) que conta classes Tailwind com escala numérica de cor em `src/`, mais uma catraca CLI (`--baseline`/`--check`) e o baseline versionado real do projeto: 299 ocorrências em 22 arquivos.**

## Performance

- **Duration:** 5 min (18:00:37 → 18:05:41)
- **Tasks:** 2
- **Files modified:** 3 (2 criados por task, todos novos)

## Accomplishments

- `scripts/design-tokens/raw-color-scan.mjs`: módulo ES sem dependências (`node:fs`/`node:path`/`node:url`) que exporta `RAW_COLOR_PREFIXES`, `RAW_COLOR_FAMILIES`, `RAW_COLOR_SCALE`, `RAW_COLOR_PATTERN_SOURCE`, `createRawColorRegex`, `scanText`, `scanPaths`, `readBaseline`, `writeBaseline`, `compareToBaseline`, e uma CLI com modo tabela, `--baseline`, `--check` e `--baseline-file=`.
- Extração de ocorrências via `String.prototype.split()` com regex global — nunca `RegExp.prototype.exec()`/`lastIndex`, conforme exigido pelo hook de segurança do projeto (documentado no cabeçalho do módulo).
- `design-system/raw-color-baseline.json` gravado com o baseline real: **299 ocorrências em 22 arquivos** (313 no total, menos as 14 da única exceção declarada — `src/app/api/relatorios/catalogo/route.ts`, que serve HTML autônomo com Tailwind via CDN fora do pipeline de tokens do app).
- 20 testes `node:test` cobrindo casamento positivo/negativo do regex, varredura recursiva com diretórios ignorados, determinismo, round-trip do baseline e todas as regras de `compareToBaseline` (regressão, melhoria, arquivo novo, exceção, arquivo que sumiu, fixture com baseline dopado).

## Discrepância de contagem — investigada e resolvida

O prompt de execução trazia como "ground truth" 250 ocorrências em 18 arquivos (restrito a `*.tsx` em `src/app` + `src/components`). Rodei o detector construído estritamente a partir do `<behavior>` do plano e obtive **313 ocorrências em 23 arquivos** (299/22 após excluir a exceção declarada) — que bate exatamente com o próprio inventário do plano ("23 arquivos... ~313 ocorrências") e com o critério `<done>` da Task 2 (22 arquivos no baseline).

Investigação (antes de aceitar o número do plano como certo):
- Reproduzi a contagem "250" com um grep restrito a `bg-|text-|border-` apenas: bate exatamente por arquivo (`bfx-intelligence-panel.tsx`: 100, `antecipacao-client.tsx`: 48, `importacao-client.tsx`: 9, `catalogo/page.tsx`: 13 — todos idênticos ao número fornecido).
- A diferença nos arquivos que não batem é explicada integralmente por dois fatores: (1) o grep de 250/18 não olhava os 13 prefixos restantes que o plano exige explicitamente em `<behavior>` (`ring`, `from`, `to`, `via`, `fill`, `stroke`, `divide`, `outline`, `decoration`, `placeholder`, `shadow`, `accent`, `caret`) — por exemplo `bfx-intelligence-panel.tsx` tem 24 ocorrências adicionais de `from-`/`via`/`to-` (gradientes); `importacao-client.tsx` tem 6 de `ring-`; `catalogo/page.tsx` tem 4 de `from-`/`to-`; (2) o grep de 250/18 não olhava arquivos `.ts` (perdendo `route.ts`, a própria exceção, e `button-variants.ts`) nem os 3 arquivos que só usam gradiente (`(app)/layout.tsx`, `(auth)/loading.tsx`, `(auth)/login/page.tsx`).
- **Conclusão:** o número 250/18 estava incompleto — media só 3 dos 16 prefixos exigidos pelo plano. **313/23 (299/22 sem a exceção) é o número correto** e é o que está gravado no baseline.

## Task Commits

Cada task seguiu RED → GREEN (ambas com `tdd="true"`; Task 1 também `type="tracer"`, com o gate de feedback rodado com sucesso após o GREEN antes de expandir para a Task 2):

1. **Task 1: Detector de cor crua ponta a ponta**
   - `90b8e39` test(10-01): add failing test for raw color scanner core
   - `d925193` feat(10-01): implement raw color scanner core (scanText/scanPaths/CLI)
   - `b0d3f42` refactor(10-01): scope Task 1 CLI to table mode only — correção de escopo: a implementação inicial da Task 1 havia antecipado as funções de baseline da Task 2; este commit as removeu para que a Task 2 tivesse seu próprio ciclo RED→GREEN legítimo
2. **Task 2: Baseline versionado e modo --check**
   - `93fe700` test(10-01): add failing test for baseline compare and --check ratchet
   - `224eca6` feat(10-01): implement baseline read/write/compare and CLI --check ratchet

**Baseline real gravado e squash de housekeeping:** `9835fdb` feat(10-01): detector de cor crua + baseline versionado — commit gerado automaticamente pelo pipeline de build/deploy do projeto (`git pull --rebase` — CI faz commits automáticos no branch, ver CLAUDE.md) sobre o HEAD já contendo os 5 commits acima; consolida `design-system/raw-color-baseline.json` e o arquivamento do milestone v1.1 (fases 5-9 movidas para `.planning/milestones/`, não relacionado a este plano).

_Nota: os hashes acima refletem o estado pós-rebase (`git reflog`); os commits originais desta sessão foram criados com hashes diferentes antes do rebase automático, sem perda de conteúdo — verificado bit a bit contra o estado final._

## Files Created/Modified

- `scripts/design-tokens/raw-color-scan.mjs` (344 linhas) - módulo + CLI do detector
- `scripts/design-tokens/raw-color-scan.test.mjs` (325 linhas) - 20 testes `node:test`
- `design-system/raw-color-baseline.json` (35 linhas) - baseline real: 299/22, 1 exceção

## Decisions Made

- Ordem descendente da escala numérica (950 antes de 900... antes de 50) no `RAW_COLOR_PATTERN_SOURCE`, conforme instruído no plano, para casamento previsível sem depender de backtracking.
- Delimitação de borda (espaço/aspas/crase/`:`/`[`/`(`/`{`/`;`/início de string) implementada só em `scanText` (varredura de texto bruto) e mantida fora de `RAW_COLOR_PATTERN_SOURCE`, que o plano 02 vai consumir via esquery sobre AST — onde essa lógica de borda textual não se aplica.
- Única exceção do baseline: `src/app/api/relatorios/catalogo/route.ts` (14 ocorrências), documentada com a razão de que a rota serve HTML autônomo carregando Tailwind por CDN — divergência de D-04, que previa "nenhuma exceção"; o inventário real revelou esta.
- Número correto do medidor de progresso das fases 11-14: **299** (não 250) — ver seção "Discrepância de contagem" acima.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigido escopo da Task 1 antes de iniciar a Task 2**
- **Found during:** Entre Task 1 e Task 2
- **Issue:** A implementação GREEN da Task 1 havia incluído prematuramente `readBaseline`/`writeBaseline`/`compareToBaseline` e as flags `--baseline`/`--check`, que são escopo da Task 2. Isso teria feito os testes RED da Task 2 passarem imediatamente (sem falhar antes da implementação), violando o ciclo TDD por task.
- **Fix:** Removida a implementação antecipada da Task 1 (mantendo só `scanText`/`scanPaths`/CLI tabela), confirmando RED genuíno para os testes da Task 2 antes de reimplementar.
- **Files modified:** `scripts/design-tokens/raw-color-scan.mjs`
- **Commit:** `b0d3f42`

**2. [Rule 1 - Bug] Corrigida colisão de declarações duplicadas no módulo**
- **Found during:** Após a Task 2, ao regravar o baseline real
- **Issue:** Uma leitura do arquivo revelou duas declarações concorrentes de `writeBaseline`/`readBaseline`/`compareToBaseline`/`DEFAULT_BASELINE_PATH` no módulo (`SyntaxError: Identifier 'readBaseline' has already been declared`), causada por um estado transitório em disco durante edição concorrente.
- **Fix:** Verificado que o commit HEAD (`224eca6`, e depois `9835fdb`) já continha a versão única e correta (344 linhas, sem duplicação); a árvore de trabalho convergiu de volta a esse estado sem necessidade de reescrever conteúdo. Reconfirmado com `node --test` (20/20 verde) e `git diff` vazio contra HEAD.
- **Files modified:** nenhum (estado transitório, não persistiu no commit)
- **Verification:** `node --test scripts/design-tokens/raw-color-scan.test.mjs` — 20/20 passando; `git diff scripts/design-tokens/raw-color-scan.mjs` vazio contra HEAD.

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - correção de processo/bug, nenhuma mudança de comportamento além do planejado)
**Impact on plan:** Nenhum scope creep. O primeiro ajuste preserva a integridade do ciclo TDD por task; o segundo foi um estado transitório em disco que se resolveu sem exigir edição.

## Issues Encountered

- Durante a execução, um processo automático de build/deploy do projeto (`git pull --rebase`, documentado em CLAUDE.md como "CI faz commits automaticos no branch") rebasou os commits locais e adicionou um commit de consolidação (`9835fdb`) sobre o trabalho desta sessão, incluindo o arquivamento do milestone v1.1 (não relacionado a este plano). Reconciliei verificando que o estado final da árvore de trabalho é idêntico ao esperado (20/20 testes verdes, baseline 299/22, `--check` exit 0, `package.json` intocado) antes de prosseguir.

## Next Phase Readiness

- `RAW_COLOR_PATTERN_SOURCE` está pronto para ser importado pela regra de ESLint do plano 02 (`scripts/design-tokens/raw-color-scan.mjs`).
- `design-system/raw-color-baseline.json` é o marco zero real (299) que as fases 11-14 precisam derrubar até 0 — o número **250 usado no planejamento inicial do milestone estava incorreto** e deve ser substituído por 299 em qualquer lugar (ROADMAP, PROJECT.md) que ainda cite "250" como meta.
- Nenhum bloqueio para o plano 02 (regra de ESLint) ou para o restante da fase 10.

---
*Phase: 10-fundacao-visual*
*Completed: 2026-08-03*

## Self-Check: PASSED

- FOUND: scripts/design-tokens/raw-color-scan.mjs
- FOUND: scripts/design-tokens/raw-color-scan.test.mjs
- FOUND: design-system/raw-color-baseline.json
- FOUND: .planning/phases/10-fundacao-visual/10-01-SUMMARY.md
- FOUND commits: 90b8e39, d925193, b0d3f42, 93fe700, 224eca6, 9835fdb
