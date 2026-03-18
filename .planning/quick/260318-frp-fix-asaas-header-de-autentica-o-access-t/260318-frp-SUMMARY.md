# Summary — Quick Task 260318-frp

**Task:** fix: Asaas header de autenticação access_token → Authorization (API v3)
**Date:** 2026-03-18
**Commit:** 1156dfe

## What Was Done

**Root cause identified:** A API Asaas v3 usa o header HTTP `Authorization` para autenticação, mas o código usava `access_token` (header do formato legado).

**Fix applied:** `src/lib/asaas.ts` linha 131 — alterado `access_token: config.apiKey` para `Authorization: config.apiKey`.

**Impact:** Todas as chamadas à API Asaas passam a autenticar corretamente:
- `getOrCreateCustomer` — criar/buscar cliente no Asaas
- `createBoletoPayment` — gerar cobrança tipo BOLETO
- `listPayments` — listar cobranças no dashboard de boletos
