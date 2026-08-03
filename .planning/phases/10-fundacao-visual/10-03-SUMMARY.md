---
phase: 10-fundacao-visual
plan: 03
subsystem: ui
tags: [design-tokens, oklch, wcag-contrast, tailwind, css-tokens]

requires:
  - phase: 10-fundacao-visual/10-01
    provides: raw-color-scan.mjs (scanText/scanPaths) e raw-color-baseline.json (inventário real de 174 classes cruas em 22 arquivos)
provides:
  - "design-system/DE-PARA-CORES.md — de-para cor crua → token semântico, cobrindo as 174 classes cruas distintas do inventário"
  - "scripts/design-tokens/token-contrast.mjs — verificador de contraste OKLCH puro (sem dependências), CLI com TOKEN_PAIRS exportado"
  - "scripts/design-tokens/token-contrast.test.mjs — 14 testes node:test cobrindo conversão de cor, fórmula de contraste e parsing"
  - "lista nomeada de 11 pares de tokens que reprovam hoje no globals.css (insumo direto do plano 04)"
affects: [10-fundacao-visual/10-04, "11-14 (migração de telas)"]

actuals:
  tokens: 12527
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Conversão OKLCH → sRGB implementada com Math puro (sem biblioteca de cor), reaproveitável por qualquer script futuro que precise ler globals.css"
    - "Parsing de CSS com brace-matching manual + split — nunca RegExp.prototype.exec, por restrição de hook de segurança do projeto"

key-files:
  created:
    - design-system/DE-PARA-CORES.md
    - scripts/design-tokens/token-contrast.mjs
    - scripts/design-tokens/token-contrast.test.mjs
  modified: []

key-decisions:
  - "Purple/indigo/violet/cyan em bfx-intelligence-panel.tsx viram token info/info-bg (conteúdo informacional/destaque da IA); indigo já estava previsto em D-02 junto com blue"
  - "Purple em antecipacao-client.tsx (status \"parcialmente_antecipado\") NÃO vira info — é um 4º estado de status sem token existente; proposto token novo --status-partial (D-06)"
  - "Gradiente rosa→violeta do botão \"gradient\" (button-variants.ts) e do ícone da sidebar (layout.tsx) não cabe em token semântico existente — proposto par --gradient-cta-from/--gradient-cta-to, puramente decorativo"
  - "Gradientes slate-950/900 usados só atrás de dark: em catalogo/page.tsx e login/page.tsx mapeiam para os MESMOS tokens (background/muted) que suas contrapartes claras — o token já resolve o valor por tema, eliminando o dark: depois da migração"
  - "checkPairs nunca marca par com token de alfa como aprovado (skipped explícito) — mitigação direta de T-10-08"

requirements-completed: [UI-01, UI-05]

coverage:
  - id: D1
    description: "De-para cor crua → token semântico cobrindo as 174 classes cruas distintas do inventário, com seção nomeada de tokens faltantes para o plano 04"
    requirement: "UI-01"
    verification:
      - kind: unit
        ref: "cobertura automatizada da task 1 (scanText de todos os arquivos do baseline vs. DE-PARA-CORES.md) — comando inline, ver Task Commits"
        status: pass
    human_judgment: false
  - id: D2
    description: "Verificador de contraste OKLCH dos tokens (UI-05), com testes node:test e CLI que reprova o globals.css atual, incluindo ring/background no tema claro"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "scripts/design-tokens/token-contrast.test.mjs (14 testes)"
        status: pass
      - kind: other
        ref: "node scripts/design-tokens/token-contrast.mjs — exit 1 esperado neste plano"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-08-03
status: complete
---

# Phase 10 Plan 03: De-para de cores e verificador de contraste Summary

**Mapa de-para das 174 classes cruas do inventário para tokens semânticos, mais um verificador OKLCH de contraste WCAG que hoje reprova 11 pares no `globals.css` — a régua que o plano 04 precisa fazer passar.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 2
- **Files modified:** 3 (todos novos)

## Accomplishments

- `design-system/DE-PARA-CORES.md`: documento versionado com uma linha por classe crua distinta
  (174 no total, superando a estimativa de 158 porque o scanner conta variantes de opacidade
  como `bg-purple-900/30` separadamente), agrupado por família, com o token de destino, o
  significado e onde a classe aparece.
- Purple/indigo/violet/cyan em `bfx-intelligence-panel.tsx` classificados como `info`/`info-bg`
  (conteúdo informacional/destaque de recurso da IA); purple em `antecipacao-client.tsx`
  classificado separadamente como um 4º estado de status sem token existente (`status-partial`,
  novo).
- Seção "Tokens que faltam" nomeando `success-bg`, `warning-bg`, `error-bg`, `info-bg`,
  `card-elevated` (só em `.dark` hoje, ausentes de `:root` e `@theme inline`),
  `--primary-hover`/`--accent-hover` (ausentes de `@theme inline`), e os dois pares novos
  (`status-partial`, `gradient-cta-from`/`gradient-cta-to`) — lista de trabalho direta do
  plano 04.
- `scripts/design-tokens/token-contrast.mjs`: verificador puro (sem dependências) que converte
  OKLCH → sRGB, calcula a razão de contraste WCAG 2.x e verifica 17 pares de tokens
  (`TOKEN_PAIRS`, exportado) nos dois temas — CLI imprime tabela e sai 1 se houver reprovação.
- `scripts/design-tokens/token-contrast.test.mjs`: 14 testes `node:test` cobrindo
  `oklchToSrgb`, `contrastRatio`, `parseTokens` e `checkPairs`, escritos e confirmados em RED
  (`ERR_MODULE_NOT_FOUND`) antes da implementação.
- Rodado contra o `globals.css` atual: **11 de 34 verificações reprovam** (ver tabela completa
  abaixo) — a régua está entregue, a correção é do plano 04.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: De-para completo cor crua → token semântico** - `87549ad` (docs)
2. **Task 2: Verificador de contraste (RED)** - `feaa26c` (test)
3. **Task 2: Verificador de contraste (GREEN)** - `2025a8c` (feat)

**Plan metadata:** commit final deste SUMMARY, a seguir.

## Files Created/Modified

- `design-system/DE-PARA-CORES.md` — de-para cor crua → token, com as 6 seções exigidas (princípio,
  tabela por família, tokens que faltam, D-03, exceção do catálogo, como usar nas fases 11-14).
- `scripts/design-tokens/token-contrast.mjs` — conversão OKLCH→sRGB, `contrastRatio`,
  `parseTokens`, `checkPairs`, `TOKEN_PAIRS`, CLI.
- `scripts/design-tokens/token-contrast.test.mjs` — 14 testes `node:test`.

## Decisões Made

- Ver `key-decisions` no frontmatter para as decisões de classificação de purple/indigo/violet/
  rose. Resumo: a mesma família de cor pode ter destinos diferentes dependendo do significado no
  ponto de uso (D-02) — purple não é um único token em todo o projeto.
- Nenhum pacote novo instalado (restrição do projeto); `vitest` não roda aqui, testes usam
  `node:test` conforme já estabelecido no plano 01.

## Lista de reprovações do verificador (insumo do plano 04)

Rodando `node scripts/design-tokens/token-contrast.mjs` contra o `globals.css` atual:

| Par | Tema | Razão | Mínimo | Resultado |
|---|---|---|---|---|
| `accent-foreground`/`accent` | light | 2.89 | 4.5 | FAIL |
| `success-foreground`/`success` | light | 2.89 | 4.5 | FAIL |
| `error-foreground`/`error` | light | 4.27 | 4.5 | FAIL |
| `info-foreground`/`info` | light | 4.03 | 4.5 | FAIL |
| `destructive-foreground`/`destructive` | light | 4.27 | 4.5 | FAIL |
| `destructive-foreground`/`destructive` | dark | 3.23 | 4.5 | FAIL |
| `ring`/`background` (indicador de foco, UI-06) | light | 2.48 | 3.0 | FAIL |
| `border`/`background` | light | 1.21 | 3.0 | FAIL |
| `border`/`background` | dark | 1.83 | 3.0 | FAIL |
| `border`/`card` | light | 1.24 | 3.0 | FAIL |
| `border`/`card` | dark | 1.70 | 3.0 | FAIL |

`ring`/`background` no tema claro (2.48 < 3.0) confirma exatamente o fato apurado no CONTEXT.
As reprovações de `border`/`background` e `border`/`card` (light e dark) eram inesperadas no
planejamento inicial — o `--border` atual é próximo demais do fundo em ambos os temas; ficam
registradas aqui para o plano 04 tratar junto do `--ring`.

23 dos 34 pares passam hoje (23 PASS, 11 FAIL, 0 SKIP — nenhum dos 17 pares verificados
depende de token com alfa).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - achado durante verificação] Lista de reprovações maior que a única citada no CONTEXT**
- **Found during:** Task 2, ao rodar o CLI contra `globals.css`
- **Issue:** O CONTEXT citava apenas `ring`/`background` como reprovação confirmada. O
  verificador revelou mais 10 reprovações (contraste de `-foreground` sobre token sólido no tema
  claro para accent/success/error/info/destructive, e `border` contra `background`/`card` nos
  dois temas).
- **Fix:** Nenhuma correção de código — é o comportamento esperado do plano ("o comando reprova o
  estado atual"). A ação foi documentar a lista completa e exata aqui, para o plano 04 não
  descobrir tarde que o escopo de correção é maior que um único par.
- **Files modified:** nenhum (achado documentado, não corrigido nesta fase)
- **Verification:** `node scripts/design-tokens/token-contrast.mjs` reproduzido, tabela conferida
  linha a linha contra os valores de `globals.css`.
- **Committed in:** não aplicável (achado de verificação, não mudança de código)

---

**Total deviations:** 1 (achado de escopo, sem mudança de código)
**Impact on plan:** Nenhum impacto na implementação desta fase — o plano previa exatamente essa
descoberta ("ESPERADO NESTE PLANO: o verificador REPROVA"). O impacto é no plano 04, que herda
uma lista de trabalho maior que a citada no CONTEXT original.

## Issues Encountered

None — TDD RED/GREEN correu como esperado; `node --test` e o scanner do plano 01 confirmaram
os dois artefatos sem iteração adicional.

## Known Stubs

Nenhum. Os dois artefatos desta fase são consultivos/de verificação (documento + script), sem
UI renderizada e sem dado mockado.

## User Setup Required

None - nenhuma configuração de serviço externo.

## Next Phase Readiness

- `design-system/DE-PARA-CORES.md` está pronto para consulta pelas fases 11-14.
- O plano 04 tem a lista exata de tokens a criar (seção "Tokens que faltam") e a lista exata de
  pares a corrigir (tabela acima) — nenhuma descoberta adicional deveria ser necessária antes de
  editar `globals.css`.
- `scripts/design-tokens/token-contrast.mjs` está pronto para virar gate de CI depois que o
  plano 04 corrigir `globals.css` — não adicionado a `npm run`/CI nesta fase, por restrição
  explícita do plano ("o gate de contraste só pode entrar no CI depois que o globals.css estiver
  corrigido").

---
*Phase: 10-fundacao-visual*
*Completed: 2026-08-03*

## Self-Check: PASSED

- FOUND: design-system/DE-PARA-CORES.md
- FOUND: scripts/design-tokens/token-contrast.mjs
- FOUND: scripts/design-tokens/token-contrast.test.mjs
- FOUND: .planning/phases/10-fundacao-visual/10-03-SUMMARY.md
- FOUND commit: 87549ad
- FOUND commit: feaa26c
- FOUND commit: 2025a8c
