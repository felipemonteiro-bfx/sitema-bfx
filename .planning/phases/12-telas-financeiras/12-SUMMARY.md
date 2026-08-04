---
phase: 12-telas-financeiras
plan: antecipacao-client
subsystem: ui
tags: [design-tokens, oklch, tailwind, financeiro, antecipacao]

requires:
  - phase: 10-fundacao-visual/10-03
    provides: design-system/DE-PARA-CORES.md (mapa cor crua → token semântico)
  - phase: 10-fundacao-visual/10-04
    provides: success-bg/warning-bg/error-bg/info-bg/card-elevated/primary-hover/accent-hover já criados nos dois temas
provides:
  - "src/components/antecipacao-client.tsx migrado para tokens semânticos — 0 ocorrências de cor crua"
  - "--status-partial / --status-partial-foreground: novo token para o 4o estado do fluxo de antecipação, criado em :root, .dark, @theme inline e tailwind.config.ts"
affects: ["13-telas-de-dados-e-ia", "14-telas-de-sistema-e-publicas"]

actuals:
  tokens: 4200
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Hover/active de botão CTA sólido usa modificador de opacidade sobre o token base (bg-success/90, bg-status-partial/15) em vez do token -bg literal do de-para, quando o de-para mapeia tons 700+/alpha para -bg mas o contexto é um botão sólido (não um fundo sutil de card) — preserva o hover visualmente distinguível"
    - "dark: manual removido sempre que o token -bg/-foreground já resolve o valor certo por tema (bg-success-bg substitui bg-green-50 dark:bg-green-950/30 inteiro)"

key-files:
  created: []
  modified:
    - src/components/antecipacao-client.tsx
    - src/app/globals.css
    - tailwind.config.ts

key-decisions:
  - "Token novo --status-partial + --status-partial-foreground criado nos 4 pontos exigidos (:root, .dark, @theme inline, tailwind.config.ts) — não existia antes desta fase, confirmado por grep antes de editar"
  - "Valores oklch escolhidos para --status-partial: light oklch(0.55 0.22 300) com texto claro (5.20:1), dark oklch(0.72 0.20 300) com texto escuro (7.19:1) — segue o mesmo padrão estrutural de --error (L baixo/saturado no claro precisa de texto branco, L alto no escuro precisa de texto escuro), ambos acima do mínimo 4.5:1 (UI-05). Verificado manualmente com as funções exportadas de token-contrast.mjs, não registrado em TOKEN_PAIRS (script é compartilhado entre 3 executores concorrentes nesta wave — evitado editá-lo para não gerar conflito de merge)"
  - "[Rule 1 - correção automática] Botão CTA 'Antecipar' (bg-green-600 hover:bg-green-700 active:bg-green-800): o de-para mapeia bg-green-700/800 para success-bg (regra geral de tom 700+ → variante -bg), mas success-bg é um fundo pastel/quase transparente — usá-lo como hover/active de um botão sólido produziria um botão que 'clareia' ao passar o mouse, quebrando a affordance de pressionar. Usado hover:bg-success/90 active:bg-success/80 (modificador de opacidade sobre o token sólido) para manter o escurecimento esperado, preservando a mesma família semântica (success)"
  - "Badges e o CTA passam a usar {token}-foreground (texto escuro/claro calculado por contraste) em vez de text-white fixo — corrige contraste real: bg-success/bg-warning/bg-info todos precisam de texto escuro (6.56:1/9.44:1/4.71:1) para passar UI-05, texto branco fixo estava abaixo do mínimo em pelo menos um dos casos antes desta fase"
  - "Linhas da tabela: hover do estado 'parcialmente_antecipado' e 'em_andamento' usa modificador de opacidade sobre o token sólido (hover:bg-status-partial/15, hover:bg-info/15) para manter um destaque de hover distinto do fundo -bg de repouso — mesma lógica do CTA acima"

requirements-completed: [FIN-01, FIN-03]

coverage:
  - id: D1
    description: "Zero cor crua em src/components/antecipacao-client.tsx"
    requirement: "FIN-01"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/raw-color-scan.mjs src — antecipacao-client.tsx ausente da lista (0 ocorrências), confirmado por grep manual do padrão de família/escala"
        status: pass
    human_judgment: false
  - id: D2
    description: "Indicadores de status usam token semântico (success/status-partial/info/warning), nunca cor crua; cor nunca é o único indicador de estado (D-03)"
    requirement: "FIN-03"
    verification:
      - kind: other
        ref: "Leitura do diff: StatusBadge mantém o texto (Antecipado/Parcial/Em andamento/Pendente) junto da cor em todos os 4 estados"
        status: pass
    human_judgment: true
  - id: D3
    description: "Contraste dos tokens (incluindo o novo status-partial) permanece ≥ mínimo WCAG nos dois temas, sem regressão"
    requirement: "FIN-02"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/token-contrast.mjs — 34 passaram, 0 reprovaram (igual ao estado anterior à fase); status-partial verificado manualmente via oklchToSrgb/contrastRatio exportados (5.20:1 light, 7.19:1 dark)"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-08-04
status: complete
---

# Phase 12: Antecipação (financeiro) — migração para tokens semânticos Summary

**As 49 ocorrências de cor crua de `antecipacao-client.tsx` (green/purple/blue/amber) foram substituídas por tokens semânticos (`success`/`status-partial`/`info`/`warning`), incluindo a criação do token novo `--status-partial` para o 4o estado do fluxo — zero ocorrências restantes, contraste 34/34 preservado.**

## Performance

- **Duration:** ~35 min
- **Files modified:** 3 (`antecipacao-client.tsx`, `globals.css`, `tailwind.config.ts`)

## Accomplishments

- `src/components/antecipacao-client.tsx`: as 49 ocorrências de cor crua identificadas pelo
  scanner (`raw-color-scan.mjs`) foram migradas, uma a uma, para a classe do token indicado em
  `design-system/DE-PARA-CORES.md` — `bg-green-600` → `bg-success`, `bg-purple-600` →
  `bg-status-partial`, `bg-blue-600` → `bg-info`, `bg-amber-500` → `bg-warning`, e todas as
  variantes de fundo sutil/borda/texto/opacidade das 4 famílias.
- `--status-partial` + `--status-partial-foreground`: token novo criado nos 4 pontos exigidos
  (`:root`, `.dark`, `@theme inline`, `tailwind.config.ts`) — confirmado por grep antes de editar
  que ele ainda não existia (só `success-bg`/`warning-bg`/`error-bg`/`info-bg`/`card-elevated`/
  `primary-hover`/`accent-hover` já tinham sido criados pelo plano 10-04).
- Badges de status (`Antecipado`/`Parcial`/`Em andamento`/`Pendente`) passam a usar
  `{token}-foreground` em vez de `text-white` fixo — corrige contraste real (o token
  `-foreground` já é calculado para ≥4.5:1 sobre o token base correspondente).
- `dark:` manual removido em todos os pontos onde o token `-bg` já resolve o valor certo por tema
  (ex.: `bg-green-50 dark:bg-green-950/30` → `bg-success-bg`) — a duplicação de estilo por tema
  deixou de existir no JSX, conforme o ganho descrito na seção 2 do DE-PARA-CORES.md.
- D-03 preservado sem alteração de texto/lógica: os 4 badges de status continuam com o rótulo de
  texto junto da cor.

## Task Commits

1. `0c12415` — `feat(12-telas-financeiras): adicionar token status-partial nos dois temas`
   (globals.css, tailwind.config.ts)
2. `5124019` — `refactor(12-telas-financeiras): migrar antecipacao-client para tokens semanticos`
   (antecipacao-client.tsx)

## Files Created/Modified

- `src/app/globals.css` — `--status-partial`/`--status-partial-foreground` em `:root` e `.dark`,
  expostos em `@theme inline`.
- `tailwind.config.ts` — `colors.status.partial.{DEFAULT,foreground}` (gera `bg-status-partial`,
  `text-status-partial-foreground`).
- `src/components/antecipacao-client.tsx` — 49 classes de cor crua substituídas por classes de
  token; nenhuma mudança de layout, texto ou lógica de negócio.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug de UX] CTA "Antecipar" não pode usar `success-bg` no hover/active**
- **Found during:** migração do botão CTA principal (linha ~470)
- **Issue:** O de-para mapeia `bg-green-700`/`bg-green-800` (hover/active do botão) para
  `success-bg` — regra geral de tom 700+ vira variante `-bg`. Mas `success-bg` é um fundo pastel
  quase transparente, pensado para cards/linhas de tabela, não para escurecer um botão sólido no
  hover. Aplicar literalmente produziria um botão que clareia ao passar o mouse, quebrando a
  affordance de "pressionar".
- **Fix:** usado `hover:bg-success/90 active:bg-success/80` — modificador de opacidade sobre o
  token sólido `success`, mantendo o escurecimento esperado e a mesma família semântica.
- **Files modified:** `src/components/antecipacao-client.tsx`
- **Verification:** revisão visual do diff; nenhuma classe de cor crua remanescente
  (`raw-color-scan.mjs` confirma 0).
- **Committed in:** `5124019`

**2. [Rule 1 - Bug de UX] Hover das linhas "parcial"/"em andamento" precisa de tom distinto do repouso**
- **Found during:** migração da linha `className` condicional da tabela (linha ~322)
- **Issue:** mesmo problema do item 1 em escala menor — `hover:bg-purple-100/70` e
  `hover:bg-blue-100/70` originais eram levemente mais saturados que o fundo de repouso
  (`bg-purple-50`/`bg-blue-50`). Mapear ambos para o mesmo token `-bg` (ou `status-partial` sem
  variante) elimina a diferença visual entre repouso e hover.
- **Fix:** repouso usa o token `-bg` (`bg-info-bg`) ou opacidade baixa (`bg-status-partial/10`,
  já que `status-partial` não tem variante `-bg` dedicada); hover usa opacidade um degrau acima
  (`hover:bg-info/15`, `hover:bg-status-partial/15`) sobre o token sólido.
- **Files modified:** `src/components/antecipacao-client.tsx`
- **Verification:** mesma verificação do item 1.
- **Committed in:** `5124019`

---

**Total deviations:** 2 (ambas Rule 1, mesma categoria — preservar affordance de hover/estado
interativo que o mapeamento mecânico do de-para por família de tom teria eliminado)
**Impact on plan:** Nenhum impacto na estrutura da fase — o de-para continua sendo a fonte de
verdade para o *significado* de cada cor; as duas correções só ajustam qual variante do token
(sólido vs. `-bg` vs. opacidade) melhor serve o contexto de interação, sem introduzir cor nova.

## Verification

```
$ grep -c '(bg|text|border|...)-(...)-(950|...|50)(/[0-9]{1,3})?' src/components/antecipacao-client.tsx
0

$ node scripts/design-tokens/raw-color-scan.mjs src
... (antecipacao-client.tsx ausente da lista)

$ node scripts/design-tokens/token-contrast.mjs
Resumo: 34 passaram, 0 reprovaram, 0 pulados (alfa/token ausente).
```

**Ocorrências restantes em `antecipacao-client.tsx`: 0** (meta atingida).

## Issues Encountered

None — o de-para (`design-system/DE-PARA-CORES.md`) cobria as 49 ocorrências linha a linha; as
únicas decisões não-triviais foram as duas correções de Rule 1 documentadas acima.

## Known Stubs

Nenhum. Migração puramente de origem de cor, sem dado mockado nem componente sem fonte de dados.

## User Setup Required

None.

## Next Phase Readiness

- `--status-partial`/`--status-partial-foreground` já existe nos dois temas e pode ser reutilizado
  por qualquer outra tela que precise representar um "estado intermediário/parcial" (ex.: fases
  13/14, se aplicável).
- `antecipacao-client.tsx` está pronto para nova verificação visual (screenshot claro/escuro) —
  não executada nesta sessão por restrição de escopo (só origem de cor, sem Playwright disponível
  no ambiente desta tarefa).

---
*Phase: 12-telas-financeiras*
*Completed: 2026-08-04*

## Self-Check: PASSED

- FOUND: src/components/antecipacao-client.tsx
- FOUND: src/app/globals.css (token status-partial)
- FOUND: tailwind.config.ts (colors.status.partial)
- FOUND: .planning/phases/12-telas-financeiras/12-SUMMARY.md
- FOUND commit: 0c12415
- FOUND commit: 5124019
