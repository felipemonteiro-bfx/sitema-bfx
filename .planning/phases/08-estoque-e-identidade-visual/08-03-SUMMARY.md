---
phase: 08-estoque-e-identidade-visual
plan: 03
subsystem: ui
tags: [css, oklch, design-tokens, css-parsing-gate, requirements-tracking]

requires:
  - phase: 08-estoque-e-identidade-visual
    provides: "08-CONTEXT.md com a investigacao de producao ja fechada para UXP-04 (D-01, D-02)"
provides:
  - "Tokens de fundo/superficie do tema claro (--background, --card, --popover, --glass-bg) com croma 0 em src/app/globals.css"
  - "Gate de CI (src/__tests__/tokens-fundo-neutro.test.ts) que falha se o croma voltar ou se um token for renomeado/removido"
  - "Evidencia versionada de UXP-04 em 08-EVIDENCE-UXP-04.md"
  - "UXP-06 registrada em REQUIREMENTS.md como pendencia bloqueada (paleta oficial da BFX)"
affects: [09-integracoes-e-carga-de-dados]

actuals:
  tokens: 2000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Parser de CSS sem RegExp exec: split('}') + split('{') para achar seletor, .startsWith() para achar token, .split('/') para descartar alfa — usado tanto no one-liner de <verify> quanto no teste vitest, para os dois gates concordarem"

key-files:
  created:
    - src/__tests__/tokens-fundo-neutro.test.ts
    - .planning/phases/08-estoque-e-identidade-visual/08-EVIDENCE-UXP-04.md
  modified:
    - src/app/globals.css
    - .planning/REQUIREMENTS.md

key-decisions:
  - "D-01 aplicada literalmente: --background, --card, --popover e --glass-bg do tema claro zerados para croma 0, luminosidade e alfa preservados; bloco .dark intocado"
  - "D-02 registrada como pendencia bloqueada (UXP-06): paleta oficial da BFX nao entra nesta fase por falta dos hex do cliente"
  - "UXP-04 tratado como ja resolvido no discuss; esta plano so versiona a evidencia, sem reconsultar o cluster"

patterns-established:
  - "Gate de CI que parseia CSS puro (sem browser/build) para travar tokens de design contra regressao silenciosa"

requirements-completed: [UXP-04, UXP-05]

coverage:
  - id: D1
    description: "Tokens de fundo do tema claro (--background, --card, --popover, --glass-bg) com croma 0, travados por gate de CI"
    requirement: "UXP-05"
    verification:
      - kind: unit
        ref: "src/__tests__/tokens-fundo-neutro.test.ts (todos os 6 casos)"
        status: pass
      - kind: other
        ref: "node one-liner do <verify> da Task 1 — imprime 'UXP-05 TOKENS OK'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Evidencia de UXP-04 (origem do amarelo) versionada em artefato verificavel"
    requirement: "UXP-04"
    verification:
      - kind: other
        ref: "node one-liner do <verify> da Task 2 — imprime 'UXP-04 EVIDENCIA OK'"
        status: pass
    human_judgment: false
  - id: D3
    description: "UXP-06 (paleta oficial BFX) registrada em REQUIREMENTS.md como pendencia bloqueada, D-02"
    verification:
      - kind: other
        ref: "node one-liner do <verify> da Task 3 — imprime 'D-02 PENDENCIA OK'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Fundo/cards do tema claro leem como branco/cinza neutro com filtros de tela desligados (verificacao visual)"
    requirement: "UXP-05"
    verification: []
    human_judgment: true
    rationale: "Requer olho humano comparando a UI renderizada com um print anterior, com Night Shift/f.lux desligados — nao automatizavel sem acesso visual real ao navegador do usuario."

duration: 3min
completed: 2026-08-03
status: complete
---

# Phase 8 Plan 3: Evidencia UXP-04 + tokens de fundo zero-croma (UXP-05) Summary

**Croma zerado nos quatro tokens de fundo do tema claro (`oklch(... 0.01 90)` -> `oklch(... 0 0)`), travado por um gate de CI que parseia `globals.css` sem depender de build/browser, mais a evidencia de producao que fechou UXP-04 versionada em artefato, e a paleta oficial da BFX registrada como pendencia bloqueada (UXP-06/D-02).**

## Performance

- **Duration:** ~3 min (commits entre 14:57:57 e 15:00:34 -04:00)
- **Started:** 2026-08-03T14:57:57-04:00
- **Completed:** 2026-08-03T15:00:34-04:00
- **Tasks:** 3/3
- **Files modified:** 4 (2 criados, 2 editados)

## Accomplishments
- `--background`, `--card`, `--popover` e `--glass-bg` do tema claro em `src/app/globals.css` agora tem croma exatamente 0 (luminosidade e alfa preservados; `--glass-bg` mantem `80%` de alfa)
- Gate de CI (`src/__tests__/tokens-fundo-neutro.test.ts`, 6 casos) e one-liner local (`node --input-type=module`) travam o croma zero e a contagem exata de 4 tokens, fechando a saida por vacuidade (renomear/apagar um token quebra o teste)
- Bloco `.dark` continua byte a byte como estava — nenhuma linha do dark mode foi tocada
- `08-EVIDENCE-UXP-04.md` versiona a investigacao de producao (digest da imagem, chunk CSS servido, os dois hex creme, conclusao dupla: filtro de tela do cliente + fundo genuinamente quente)
- `REQUIREMENTS.md` ganha UXP-06 (paleta oficial da BFX), explicitamente bloqueada por falta dos hex do cliente, sem alterar nenhum requisito existente

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Tokens de fundo do tema claro com croma zero, travados por gate (UXP-05, D-01)**
   - `38ea15b` (test) — RED: teste falhando confirmado (todos os 4 tokens com croma 0.01)
   - `350c6ae` (feat) — GREEN: croma zerado, one-liner imprime `UXP-05 TOKENS OK`
2. **Task 2: Versionar a evidencia de UXP-04** - `3e9ab99` (docs)
3. **Task 3: Registrar UXP-06 como pendencia bloqueada (D-02)** - `ff1174d` (docs)

**Plan metadata:** commit final de STATE/ROADMAP/REQUIREMENTS (ver secao "Final commit" abaixo — pendente no momento em que este SUMMARY foi escrito).

_Nota: Task 1 e `tdd="true"` (tracer), por isso tem dois commits (test -> feat); sem refactor por nao haver necessidade._

## Files Created/Modified
- `src/app/globals.css` - `--background`, `--card`, `--popover`, `--glass-bg` do tema claro com croma 0 (linhas 80, 112, 114, 298)
- `src/__tests__/tokens-fundo-neutro.test.ts` - gate de CI (6 casos: os 4 tokens com croma 0, contagem exata de 4 achados, `.dark` intacto)
- `.planning/phases/08-estoque-e-identidade-visual/08-EVIDENCE-UXP-04.md` - evidencia versionada de UXP-04
- `.planning/REQUIREMENTS.md` - UXP-06 adicionada (requisito + linha na matriz de cobertura), pendencia bloqueada por D-02

## Decisions Made
- D-01 (ja tomada no discuss, aplicada aqui): zerar croma em vez de aplicar paleta de marca — reversivel, nao depende de hex oficiais
- D-02 (ja tomada no discuss, registrada aqui): paleta completa da BFX fica fora desta fase, tracked como UXP-06 bloqueada
- UXP-04 tratado como satisfeito desde o discuss (2026-08-03), antes de qualquer alteracao de token — este plano so versiona a evidencia ja levantada, sem reconsultar o cluster de producao

## Deviations from Plan

### Auto-fixed Issues

Nenhuma. As tres tasks seguiram exatamente a acao descrita no plano — trocar so os quatro valores especificados, transcrever a evidencia ja levantada, e adicionar UXP-06 por `Edit` pontual.

### Issue de concorrencia no worktree compartilhado (nao e bug de codigo)

Durante o `git commit` da Task 1 (GREEN), um commit de outro executor concorrente (Plan 08-02, que possui `src/lib/estoque-metrics.ts` e `src/app/(app)/financeiro/page.tsx`) foi acidentalmente incluido no meu commit `350c6ae`. Sequencia exata:

1. Verifiquei `git diff --cached --name-only` logo apos `git add src/app/globals.css` — mostrou so `src/app/globals.css`, como esperado.
2. Entre essa verificacao e o `git commit` (chamadas de ferramenta separadas), o executor do Plan 08-02 rodou `git add` nos dois arquivos dele nesse mesmo working tree compartilhado.
3. Meu `git commit -m "..."` (sem lista de arquivos) commitou tudo que estava staged **naquele instante** — os dois arquivos do 08-02, alem do meu `globals.css`.

**Verificado:** o conteudo dos dois arquivos misturados (`estoque-metrics.ts`, `financeiro/page.tsx`) e a implementacao GREEN legitima do Plan 08-02 (`calcularMetricasEstoque` real, transplantado de `financeiro/page.tsx`), nao codigo quebrado ou incompleto — a mensagem do commit `350c6ae` ficou com atribuicao incorreta (menciona so UXP-05), mas o diff de `src/app/globals.css` dentro desse commit e exatamente as 4 linhas esperadas.

**Por que nao corrigi reescrevendo historico:** logo depois, outro commit do Plan 08-01 (`cee8143`) ja empilhou em cima de `350c6ae`. Reescrever historia agora (`reset`/`rebase`) e proibido por `<destructive_git_prohibition>` neste contexto multi-executor e arriscaria destruir o trabalho de outro executor ativo. Optei por documentar com transparencia total em vez de tentar "consertar" a historia.

**Mitigacao aplicada no restante da execucao:** para as Tasks 2 e 3, passei a rodar `git add` + verificacao de `git diff --cached --name-only` + `git commit` na mesma chamada de ferramenta (mesmo bloco bash), fechando a janela de corrida. Ambos os commits seguintes (`3e9ab99`, `ff1174d`) foram confirmados como contendo **apenas** o arquivo esperado antes de committar.

**Impacto no plano:** nenhum. O conteudo de `src/app/globals.css` no commit `350c6ae` e exatamente o que a Task 1 pedia (verificado por `git diff` isolado do arquivo). Nenhum arquivo fora do escopo desta plano (`src/app/globals.css`, `08-EVIDENCE-UXP-04.md`, `.planning/REQUIREMENTS.md`, `tokens-fundo-neutro.test.ts`) foi criado ou editado por mim. O commit `350c6ae` tem uma mensagem que nao reflete 100% do seu conteudo (efeito colateral do worktree compartilhado), o que deve ser sinalizado ao orquestrador/usuario.

---

**Total deviations:** 0 auto-fixes de codigo; 1 incidente de concorrencia documentado (nao e Rule 1-4, e um artefato do ambiente multi-executor compartilhando working tree sem isolamento de worktree real)
**Impact on plan:** Nenhum no conteudo entregue por este plano. Atribuicao de commit de terceiros ficou incorreta em `350c6ae` — recomendado que o orquestrador esteja ciente ao consolidar o historico da fase.

## Issues Encountered
Ver "Issue de concorrencia no worktree compartilhado" acima. Resolvido via mitigacao de processo (add+check+commit atomico na mesma chamada) para o restante da execucao; nenhum retrabalho de codigo necessario.

## User Setup Required
None - nenhuma configuracao de servico externo necessaria.

## Next Phase Readiness
- UXP-04 e UXP-05 (D-01) entregues e travados por gate de CI; nada pendente de acao humana para estes dois requisitos.
- UXP-06 (paleta oficial da BFX) permanece bloqueada no backlog ate o cliente fornecer os hex oficiais (primary, accent, fundo) — nao e blocker para a Fase 9.
- Recomenda-se verificacao visual humana (D4 no `coverage`): abrir o sistema no tema claro com Night Shift/f.lux/modo leitura desligados e confirmar que fundo e cards leem como branco/cinza neutro.
- Atencao do orquestrador: o commit `350c6ae` desta fase contem, alem da mudanca de `globals.css`, arquivos do Plan 08-02 (`estoque-metrics.ts`, `financeiro/page.tsx`) que foram acidentalmente incluidos por uma corrida de `git add`/`git commit` em working tree compartilhado sem isolamento de worktree. O conteudo esta correto; a atribuicao do commit nao.

## Self-Check: PASSED

All created/modified files confirmed present (`src/app/globals.css`, `src/__tests__/tokens-fundo-neutro.test.ts`, `.planning/phases/08-estoque-e-identidade-visual/08-EVIDENCE-UXP-04.md`, `.planning/REQUIREMENTS.md`). All four commits (`38ea15b`, `350c6ae`, `3e9ab99`, `ff1174d`) confirmed present in `git log`.

---
*Phase: 08-estoque-e-identidade-visual*
*Completed: 2026-08-03*
