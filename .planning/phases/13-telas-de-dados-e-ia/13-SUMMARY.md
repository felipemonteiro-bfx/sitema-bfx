---
phase: 13-telas-de-dados-e-ia
plan: "13"
subsystem: ui
tags: [design-tokens, colors, ia, crm, dark-mode]

requires:
  - phase: 10-fundacao-visual/10-03
    provides: "design-system/DE-PARA-CORES.md — de-para cor crua → token semântico, com seção dedicada ao painel de IA"
  - phase: 10-fundacao-visual/10-04
    provides: "tokens success/warning/error/info (+ -bg/-foreground) completos nos dois temas em globals.css"
provides:
  - "src/components/bfx-intelligence-panel.tsx migrado para tokens (0 ocorrências de cor crua, era 124)"
  - "src/components/campanha-template-picker.tsx migrado para tokens (0, era 4)"
  - "src/app/(app)/crm/campanhas/page.tsx migrado para tokens (0, era 2)"
affects: ["14-telas-de-sistema-e-publicas"]

tech-stack:
  added: []
  patterns:
    - "Gradientes decorativos cujos dois stops colapsam no mesmo token semântico (ex.: from-purple-600 to-indigo-600, ambos -> info) viram bg sólido de token único em vez de gradiente redundante"
    - "Fundo sólido de token (bg-info, bg-warning) sempre pareado com o -foreground correspondente (text-info-foreground, text-warning-foreground), replicando o padrão já usado em components/ui/badge.tsx, em vez de manter text-white"
    - "dark:* removido em toda substituição — os tokens semânticos já resolvem o valor certo por tema, então o par light/dark manual desaparece do JSX"
    - "hover:border-* que colapsava para o mesmo token do estado base (ex.: hover:border-purple-300 -> mesmo info que border-purple-100) foi removido por virar código morto sem efeito visual, não porque a interação em si mudou (o card mantém hover:shadow-md e group-hover:scale-110 no ícone)"

key-files:
  created: []
  modified:
    - src/components/bfx-intelligence-panel.tsx
    - src/components/campanha-template-picker.tsx
    - "src/app/(app)/crm/campanhas/page.tsx"

key-decisions:
  - "Seguido o de-para de design-system/DE-PARA-CORES.md ao pé da letra para blue/purple/indigo/violet/cyan em bfx-intelligence-panel.tsx: todos viram info/info-bg (conteúdo/destaque gerado pela IA). Consequência aceita: os badges 'Recompra' (antes azul) e 'Upgrade' (antes roxo) agora têm exatamente a mesma cor (bg-info-bg text-info) — a distinção entre os dois deixa de ser por cor e passa a ser só pelo texto do badge. Isso é uma decisão de arquitetura já tomada na Fase 10 (registrada em key-decisions do 10-03-SUMMARY.md: 'Purple/indigo/violet/cyan em bfx-intelligence-panel.tsx viram token info/info-bg'), não uma escolha desta execução — não reabri essa decisão"
  - "Gradientes multi-stop (bg-gradient-to-br from-X via-Y to-Z) cujos stops mapeiam todos para o mesmo token colapsam para bg-{token} plano, em vez de bg-gradient-to-br from-{token} via-{token} to-{token} (redundante). Afeta 4 gradientes decorativos no painel de IA (loading card, header do card principal, card de sugestões de produto, ícone quadrado das sugestões) e o gradiente âmbar→laranja do card de bundle"
  - "Nos 3 pontos onde o fundo virou sólido e saturado (bg-info no header/ícone, bg-warning no badge/botão do bundle), troquei text-white pelo token -foreground correspondente (text-info-foreground / text-warning-foreground), replicando o par já validado em components/ui/badge.tsx e com contraste WCAG verificado pelo token-contrast.mjs da Fase 10 — não deixei text-white hardcoded sobre um token que já tem foreground formal definido"

requirements-completed: [DIA-01, DIA-02]

coverage:
  - id: D1
    description: "bfx-intelligence-panel.tsx sai de 124 ocorrências de cor crua para zero"
    requirement: "DIA-01"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/raw-color-scan.mjs src — arquivo não aparece mais na lista (era 124, meta 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "campanha-template-picker.tsx e crm/campanhas/page.tsx (CRM) migrados para tokens, zero cor crua"
    requirement: "DIA-01"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/raw-color-scan.mjs src — nenhum dos dois arquivos aparece na lista (eram 4 e 2, meta 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nenhuma regressão em runAiWithActions nem no parser de tabelas markdown (split(TABLE_BLOCK_RE))"
    requirement: "DIA-02"
    verification:
      - kind: other
        ref: "diff revisado linha a linha: nenhuma linha fora de className foi tocada; grep por padrões funcionais (onAddProduto, useEffect, fetch, api/) no diff retornou vazio"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-08-04
status: complete
---

# Phase 13 Plan 13: Telas de dados e IA — de-para de cor Summary

**As 130 ocorrências de cor Tailwind crua no painel de inteligência (`bfx-intelligence-panel.tsx`), no seletor de template de campanha e na página de campanhas do CRM foram substituídas por tokens semânticos — chat de IA e CRM zerados, chegando a zero cor crua nos três arquivos.**

## Performance

- **Duration:** ~35 min
- **Files modified:** 3 (nenhum arquivo criado)
- **Ocorrências migradas:** 130 (124 + 4 + 2), conforme escopo atribuído

## Accomplishments

- `bfx-intelligence-panel.tsx` (o arquivo mais crítico do milestone, 124 ocorrências): todas as classes de blue/purple/indigo/violet/cyan viraram `info`/`info-bg`; green virou `success`/`success-bg`; amber/orange viraram `warning`/`warning-bg`; red virou `error`/`error-bg` — seguindo exatamente o de-para de `design-system/DE-PARA-CORES.md`.
- 4 gradientes decorativos multi-stop que colapsavam no mesmo token (loading card, header do card de IA, card de sugestões de produto, gradiente âmbar→laranja do bundle, quadrado de ícone das sugestões) viraram fundo sólido de token único, com o par `-foreground` correspondente no lugar de `text-white` hardcoded.
- Todos os `dark:*` manuais que compensavam cor crua desapareceram — os tokens semânticos já resolvem o valor certo em cada tema, exatamente o ganho descrito na seção 6 do DE-PARA-CORES.md.
- `campanha-template-picker.tsx`: o alerta "nenhum template aprovado" (amber) virou `border-warning bg-warning-bg`.
- `crm/campanhas/page.tsx`: o aviso de campanha legada (pré Cloud API) virou `text-warning`.
- Nenhuma linha de lógica tocada: `runAiWithActions`, os `useEffect`/`fetch` do painel, o `onAddProduto`, e o parser de tabelas markdown (`split(TABLE_BLOCK_RE)`, que não está neste arquivo) permanecem intactos — confirmado por diff linha a linha e grep negativo por padrões funcionais no diff.

## Task Commits

Trabalho comitado em um único commit atômico (as 3 mudanças são pequenas e interdependentes pelo mesmo de-para):

1. **Migração de cor crua → tokens (3 arquivos)** - `74ea5a4` (refactor)

## Files Created/Modified

- `src/components/bfx-intelligence-panel.tsx` — 124 → 0 ocorrências.
- `src/components/campanha-template-picker.tsx` — 4 → 0 ocorrências.
- `src/app/(app)/crm/campanhas/page.tsx` — 2 → 0 ocorrências.

## Decisões Made

Ver `key-decisions` no frontmatter. Resumo:
- Purple e blue no painel de IA convergem para o mesmo token (`info`), decisão herdada da Fase 10 — não reaberta aqui.
- Gradientes cujos stops colapsam no mesmo token viram cor sólida (simplificação inevitável do próprio de-para, não redesign).
- `text-white` sobre fundo de token sólido virou `text-{token}-foreground`, seguindo o par já estabelecido em `badge.tsx`.

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio classificável como Regra 1-3 (nenhum bug encontrado, nenhuma funcionalidade crítica faltando, nenhum bloqueio). As únicas decisões tomadas durante a execução foram de aplicação fiel do de-para já registrado na Fase 10 (documentadas acima em `key-decisions`, não são desvios do plano).

**Total deviations:** 0

## Issues Encountered

None.

## Known Stubs

Nenhum. Migração pura de origem de cor — nenhum dado mockado, nenhum componente sem fonte de dados.

## User Setup Required

None.

## Verification

```
node scripts/design-tokens/raw-color-scan.mjs src
```
Resultado: nenhum dos 3 arquivos migrados aparece na listagem (antes: `bfx-intelligence-panel.tsx` 124, `campanha-template-picker.tsx` 4, `crm/campanhas/page.tsx` 2 — total 130). **Meta de 0 ocorrências atingida para o escopo desta fase.**

Total remanescente em `src/` (arquivos de responsabilidade de outros executores nas fases 11/12/14, não tocados aqui): 130 ocorrências em 14 arquivos — `antecipacao-client.tsx`, `catalogo-publico-client.tsx`, `app/catalogo/page.tsx`, `api/relatorios/catalogo/route.ts` (exceção declarada no DE-PARA-CORES.md), `app/assinatura/[token]/page.tsx`, `receipt-preview.tsx`, `button-variants.ts`, `app/(auth)/login/page.tsx`, `copiar-link-assinatura.tsx`, `app/(auth)/loading.tsx`, `app/(app)/layout.tsx`, `notification-bell.tsx`, `receipt-editor-client.tsx`, `whatsapp-connect.tsx`.

```
node --test scripts/design-tokens/*.test.mjs
```
Resultado: 40/40 testes passando (0 falhas).

```
npx tsc --noEmit -p .
```
Nenhum erro de tipo nos 3 arquivos migrados.

## Next Phase Readiness

- Escopo da Fase 13 (DIA-01, DIA-02) concluído para os arquivos designados a este executor.
- Fase 14 pode prosseguir sem dependência deste trabalho — os arquivos que ela toca (dashboard, configurações, RH, login, catálogo, assinatura) não se sobrepõem aos 3 arquivos migrados aqui.

---
*Phase: 13-telas-de-dados-e-ia*
*Completed: 2026-08-04*

## Self-Check: PASSED

- FOUND: src/components/bfx-intelligence-panel.tsx
- FOUND: src/components/campanha-template-picker.tsx
- FOUND: src/app/(app)/crm/campanhas/page.tsx
- FOUND: .planning/phases/13-telas-de-dados-e-ia/13-SUMMARY.md
- FOUND commit: 74ea5a4
