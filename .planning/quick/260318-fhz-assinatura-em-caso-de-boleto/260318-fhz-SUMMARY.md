---
phase: quick
plan: 260318-fhz
subsystem: pdf-generation
tags: [pdf, recibo, assinatura, boleto, desconto-em-folha, conditional]
dependency_graph:
  requires: []
  provides: [conditional-signature-block-recibo-pdf, conditional-signature-block-recibo-route]
  affects: [src/app/api/recibo/route.ts, src/lib/recibo-pdf.ts]
tech_stack:
  added: []
  patterns: [conditional-rendering, feature-flag-from-model-field]
key_files:
  modified:
    - src/app/api/recibo/route.ts
    - src/lib/recibo-pdf.ts
decisions:
  - Signature block conditioned solely on boleto || descontoEmFolha, independent of tipo (autorizacao/venda)
  - Page height in route.ts uses 80px for signature+footer vs 30px footer-only to avoid blank space
  - Footer text in recibo-pdf.ts repositioned from y=110 to y=50 when signature is absent
metrics:
  duration: 2 minutes
  completed: 2026-03-18
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260318-fhz: Conditional Signature Block in PDF Receipts

**One-liner:** Signature block in both PDF generators now renders only when payment method is boleto or desconto em folha, with page height adjusted accordingly.

## What Was Done

Made the signature block conditional in both PDF receipt generators. Previously, every PDF always showed a signature line regardless of payment method. Now only sales with `boleto=true` or `descontoEmFolha=true` get a signature block.

## Changes

### Task 1: `src/app/api/recibo/route.ts` — commit `4bff5d7`

- Added `const showAssinatura = vendaBase.boleto || vendaBase.descontoEmFolha;` after the `vendaBase` query (line 167)
- Added `const assinaturaH = showAssinatura ? 80 : 30;` to conditionally size the page height estimate
- Wrapped signature drawing code in `if (showAssinatura) { ... }` — `y -= 48` gap moved inside the block so no blank space appears when signature is omitted
- Footer (`rodape`) remains outside the conditional and always renders

### Task 2: `src/lib/recibo-pdf.ts` — commit `e053b3a`

- Added `const showAssinatura = venda.boleto || venda.descontoEmFolha;` after the `venda` query (line 97)
- Wrapped signature drawing code in `if (showAssinatura) { ... }`
- Footer text (`y:`) changed from fixed `110` to `showAssinatura ? 110 : 50` so it doesn't float with large gap when signature is absent

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/app/api/recibo/route.ts` contains `vendaBase.boleto || vendaBase.descontoEmFolha`
- [x] `src/lib/recibo-pdf.ts` contains `venda.boleto || venda.descontoEmFolha`
- [x] Commit `4bff5d7` exists
- [x] Commit `e053b3a` exists

## Self-Check: PASSED
