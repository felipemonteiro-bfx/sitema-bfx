---
phase: quick-260326-m0e
plan: 2
subsystem: antecipacao-prudent
tags: [filtro, status, xlsx, planilha, antecipacao]
one-liner: "Filtro por empresa/status com badges coloridos + endpoint XLSX com abas mensais para Central Prudent"
key-files:
  modified:
    - src/app/(app)/prudent/page.tsx
    - src/components/antecipacao-client.tsx
  created:
    - src/app/api/relatorios/antecipacao-xlsx/route.ts
decisions:
  - "XML Spreadsheet 2003 (.xls) sem dependencias externas — sem npm install necessario"
  - "Filtro client-side em vendasFiltradas — sem roundtrip ao servidor para performance"
  - "Status derivado do campo antecipada: 0=pendente, 1=antecipado, 2=em_andamento"
  - "Data de Desconto = ultimo dia do mes de vencimento da parcela (padrao financeira Prudent)"
metrics:
  duration: "~10 min"
  completed: "2026-03-26"
  tasks_completed: 2
  files_modified: 2
  files_created: 1
---

# Phase quick-260326-m0e Plan 2: Filtro por Empresa, Status e Planilha Excel — Summary

## What Was Built

Filtro por empresa conveniada e status de antecipacao na Central Prudent, com badges visuais coloridos e geracao de planilha Excel (XML Spreadsheet 2003) com abas por mes/ano.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Filtro por empresa e status nas vendas | 487ea14 | page.tsx, antecipacao-client.tsx |
| 2 | Endpoint XLSX com abas por mes | 25a32e4 | antecipacao-xlsx/route.ts |

## Decisions Made

1. **XML Spreadsheet 2003** — Formato .xls sem dependencias externas (npm install bloqueado). Excel e LibreOffice abrem normalmente.
2. **Filtro client-side** — vendasFiltradas calculado via useMemo/filter no componente. Sem roundtrip ao servidor.
3. **Todas as vendas na query** — Page agora busca antecipada IN (0,1,2) para exibir historico completo filtravel.
4. **Data de Desconto** — Ultimo dia do mes da parcela (ex: 31/03/2026 para parcelas de marco). Padrao correto para financeiras.

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed as written.

### Notes

- Botao "Gerar Planilha" usa `window.location.href` para download direto (sem fetch/blob).
- Checkbox desabilitado para vendas com status "antecipado" para evitar re-antecipacao.
- Fallback implementado para vendas sem `parcelasVencimento`: estima vencimentos em D+30, D+60... a partir da dataVenda.
- Botao "Limpar filtros" aparece condicionalmente quando algum filtro esta ativo.

## Self-Check

- [x] src/app/(app)/prudent/page.tsx — modified
- [x] src/components/antecipacao-client.tsx — modified
- [x] src/app/api/relatorios/antecipacao-xlsx/route.ts — created
- [x] Commit 487ea14 exists
- [x] Commit 25a32e4 exists
- [x] TypeScript: zero errors nos arquivos modificados

## Self-Check: PASSED
