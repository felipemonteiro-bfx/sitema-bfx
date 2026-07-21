---
phase: 04-melhorias-infra
plan: 02
subsystem: payments
tags: [asaas, boleto, parcelamento, error-handling]

# Dependency graph
requires: []
provides:
  - "Error handling robusto para cliente duplicado no Asaas via error code + substrings"
  - "Parcelamento Asaas com installmentValue calculado automaticamente"
affects: [boleto, parcelamento, asaas-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isAsaasDuplicateError helper encapsula logica de deteccao de duplicata com extensibilidade"
    - "asaasFetch inclui error code no formato [code] desc para melhor debugging"

key-files:
  created: []
  modified:
    - src/lib/asaas.ts

key-decisions:
  - "Deteccao de duplicata usa error code do Asaas alem de substrings para maior robustez"
  - "installmentValue calculado automaticamente a partir de totalValue/installmentCount com arredondamento 2 casas decimais"
  - "Callers podem sobrescrever installmentValue com valor explicito usando ?? operator"

patterns-established:
  - "Helper isAsaasDuplicateError: centraliza logica de deteccao, facilita adicionar novos codes sem tocar catch blocks"
  - "Erros Asaas formatados como [code] desc para diagnostico mais rapido em logs"

requirements-completed: [INF-ASAAS-01, INF-ASAAS-02]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 04 Plan 02: Corrigir integracao Asaas (duplicata + parcelamento) Summary

**Deteccao de cliente duplicado via error code Asaas e parcelamento com installmentValue calculado automaticamente**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T17:27:23Z
- **Completed:** 2026-03-30T17:28:44Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- isAsaasDuplicateError helper centraliza deteccao de duplicata com substrings expandidas (inclui cpf_cnpj_already_in_use)
- asaasFetch agora inclui error code do Asaas no formato [code] desc na mensagem de erro para melhor debugging
- createBoletoPayment calcula installmentValue automaticamente, evitando rejeicao pela API Asaas v3

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Melhorar deteccao de cliente duplicado no Asaas** - `a2efc5c` (fix)
2. **Task 2: Adicionar installmentValue no parcelamento Asaas** - `aefb1c8` (fix)

## Files Created/Modified
- `src/lib/asaas.ts` - Error handling melhorado, helper isAsaasDuplicateError, installmentValue no parcelamento

## Decisions Made
- Deteccao de duplicata usa two-layer check: erro code do Asaas + fallback para substrings (backward compat)
- installmentValue preferencia para valor explicito do caller via ?? operator; calculado automaticamente se ausente
- Substrings expandidas incluem "cpf_cnpj_already_in_use" para cobrir error code diretamente na mensagem

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Integracao Asaas mais robusta para criacao de clientes e parcelamento em sandbox e producao
- Nenhum bloqueio para proximas fases

---
*Phase: 04-melhorias-infra*
*Completed: 2026-03-30*
