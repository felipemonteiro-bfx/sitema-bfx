---
phase: 04-melhorias-infra
plan: 03
subsystem: env-validation
tags: [zod, env-vars, startup-validation, security, infrastructure]
dependency_graph:
  requires: []
  provides: [env-validation-at-startup, typed-env-object]
  affects: [src/lib/db.ts, all-server-side-routes]
tech_stack:
  added: []
  patterns: [zod-env-validation, fail-fast-startup, skip-validation-ci]
key_files:
  created:
    - src/env.ts
  modified:
    - src/lib/db.ts
    - .env.example
decisions:
  - SESSION_SECRET requires 32+ chars only in production; defaults to dev-secret in development
  - SKIP_ENV_VALIDATION env var bypasses schema validation for CI and Docker prebuild
  - env.ts NOT imported from middleware.ts (Edge Runtime incompatibility)
  - All integration vars (Asaas, Evolution, AI, MinIO, Uber) are optional for graceful degradation
metrics:
  duration: "< 1 minute"
  completed: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 04 Plan 03: Env Vars Validation Summary

## One-liner

Zod schema validation of env vars at startup via `src/env.ts`, wired into all server-side routes through `src/lib/db.ts` import, with CI bypass support and documented LiteLLM vars.

## What Was Built

### Task 1 — `src/env.ts` (commit: ede5257)

Created `src/env.ts` with a zod schema that validates all environment variables at import time. The schema:

- Marks `DATABASE_URL` and `SESSION_SECRET` as required (SESSION_SECRET enforces 32+ chars only in production)
- Marks all integration vars (Asaas, Evolution, WhatsApp, AI providers, MinIO, Uber Direct) as optional
- Exports `env` (parsed/validated object), `Env` (TypeScript type), and `validateEnv` (named function for testability)
- Checks `SKIP_ENV_VALIDATION=true` to bypass schema for CI/Docker build scenarios
- Throws a clear, formatted error message when required vars are missing

### Task 2 — `src/lib/db.ts` + `.env.example` (commit: 4ae346e)

- Added `import "@/env"` as the first import in `src/lib/db.ts` — since all server-side routes use the Prisma singleton, this ensures validation runs on every server request path
- Added LiteLLM configuration section to `.env.example` (LITELLM_URL, LITELLM_KEY, LITELLM_MODEL, LITELLM_ENABLE_THINKING)
- `SKIP_ENV_VALIDATION` was already documented in `.env.example`; no duplicate added

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| SESSION_SECRET: 32+ chars in prod only | Avoids friction in local dev while enforcing security in production |
| SKIP_ENV_VALIDATION bypass | CI builds and Docker prebuild don't have all env vars available |
| Wire via db.ts, not middleware.ts | Middleware runs on Edge Runtime which may not support all zod features |
| All integration vars optional | Features degrade gracefully when integrations are not configured |

## Verification Results

All success criteria met:
- `grep 'import.*@/env' src/lib/db.ts` — confirmed
- `grep -c "z.string" src/env.ts` — 23 validated fields
- `grep "LITELLM" .env.example` — all 4 vars documented
- `grep "SKIP_ENV_VALIDATION" .env.example` — documented in reference section

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
