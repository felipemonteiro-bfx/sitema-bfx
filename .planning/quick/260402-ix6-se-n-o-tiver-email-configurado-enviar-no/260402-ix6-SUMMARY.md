---
phase: quick-260402-ix6
plan: 1
subsystem: notifications
tags: [email, whatsapp, fallback, cron, empresas]
dependency_graph:
  requires: [src/lib/whatsapp.ts, src/lib/email.ts, src/app/api/cron/relatorio-semanal/route.ts]
  provides: [email-to-whatsapp-fallback, relatorio-semanal-all-empresas]
  affects: [sendVendaNotification, sendWeeklyReport, cron-relatorio-semanal]
tech_stack:
  added: []
  patterns: [fire-and-forget fallback, optional param backward compat]
key_files:
  modified:
    - src/lib/email.ts
    - src/app/api/cron/relatorio-semanal/route.ts
decisions:
  - "Use empresa.telefoneRh (not telefone) — plan had wrong field name; actual Prisma model field is telefoneRh"
  - "sendWeeklyReport gets telefoneFallback as 5th optional param — fully backward compatible"
  - "Cron route removes emailRh filter to include all empresas, letting sendWeeklyReport handle fallback internally"
metrics:
  duration: ~10 minutes
  completed: 2026-04-02
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260402-ix6 Summary

**One-liner:** Email-to-WhatsApp fallback in sendVendaNotification and sendWeeklyReport so partner companies always get notified even without SMTP configured.

## What Was Done

### Task 1: Add email-to-WhatsApp fallback in email.ts

Modified `sendVendaNotification` to:
- Import `enviarWhatsAppTexto` from `@/lib/whatsapp`
- Check SMTP availability via `getSmtpConfig()` and whether `emailRh` is set
- If both conditions met: send email as before
- If SMTP missing OR no emailRh: fall back to WhatsApp on `empresa.telefoneRh`
- If neither email nor phone available: log warning and return silently
- All fallback paths wrapped in try/catch — never throws

Modified `sendWeeklyReport` to:
- Add optional `telefoneFallback?: string` as 5th parameter (backward compatible)
- Check SMTP at the top of the function
- If SMTP not configured and `telefoneFallback` provided: send plain-text WhatsApp summary
- If SMTP not configured and no fallback: log warning and return
- Existing email path unchanged when SMTP is configured

### Task 2: Update cron route to include all empresas

Modified `src/app/api/cron/relatorio-semanal/route.ts`:
- Removed `where: { emailRh: { not: null } }` filter — now fetches ALL partner companies
- Removed `if (!empresa.emailRh) continue` guard
- `toEmails` array built conditionally — only adds emailRh when present
- Passes `empresa.telefoneRh ?? undefined` as `telefoneFallback` to `sendWeeklyReport`

### DATE-FIX-01 Confirmation

Per plan instructions, `date-input.tsx:57` already has `type="button"` applied (fixed in quick task 260401-np7). No code change needed — confirmed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong field name: `telefone` vs `telefoneRh`**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Plan specified `empresa.telefone` but the actual Prisma `EmpresaParceira` model field is `telefoneRh`. TypeScript error TS2551 reported during verification.
- **Fix:** Changed all references from `empresa.telefone` to `empresa.telefoneRh` in email.ts and route.ts
- **Files modified:** src/lib/email.ts
- **Commit:** be9f10a

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | be9f10a | feat(quick-260402-ix6): add WhatsApp fallback in sendVendaNotification and sendWeeklyReport |
| 2 | ee472a3 | feat(quick-260402-ix6): update cron route to include all empresas and pass telefoneFallback |

## Verification Results

1. `npx tsc --noEmit` — passes (only pre-existing test errors in env-validation.test.ts unrelated to this task)
2. `enviarWhatsAppTexto` imported and used in src/lib/email.ts — confirmed
3. No bare `throw` in sendVendaNotification or sendWeeklyReport fallback paths — confirmed
4. `emailRh: { not: null }` filter removed from relatorio-semanal/route.ts — confirmed
5. `telefoneFallback` passed via `empresa.telefoneRh` in sendWeeklyReport call — confirmed

## Self-Check: PASSED

- `/tmp/sitema-bfx/src/lib/email.ts` — exists and modified
- `/tmp/sitema-bfx/src/app/api/cron/relatorio-semanal/route.ts` — exists and modified
- Commit be9f10a — present
- Commit ee472a3 — present
