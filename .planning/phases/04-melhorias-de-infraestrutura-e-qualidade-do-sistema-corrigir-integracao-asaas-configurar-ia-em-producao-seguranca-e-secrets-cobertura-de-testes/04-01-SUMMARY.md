---
phase: 04-melhorias-infra
plan: "01"
subsystem: security
tags: [security, session, auth, admin]
dependency_graph:
  requires: []
  provides: [SESSION_SECRET-fail-fast, requireAdminOrThrow, admin-route-auth]
  affects: [src/lib/session.ts, src/middleware.ts, src/lib/guards.ts, src/lib/recibo-url.ts, src/app/api/admin/backfill-estoque/route.ts]
tech_stack:
  added: []
  patterns: [fail-fast initialization, guard functions with throw]
key_files:
  modified:
    - src/lib/session.ts
    - src/middleware.ts
    - src/lib/guards.ts
    - src/lib/recibo-url.ts
    - src/app/api/admin/backfill-estoque/route.ts
decisions:
  - "Mantida compatibilidade retroativa de requireAdmin() boolean — apenas adicionado requireAdminOrThrow()"
  - "Fail-fast em producao via throw no nivel de modulo (executa em import-time, nao em request-time)"
metrics:
  duration: "1 minute"
  completed: "2026-03-30"
  tasks_completed: 2
  files_modified: 5
---

# Phase 04 Plan 01: Security — SESSION_SECRET Fail-Fast e Admin Auth

**One-liner:** Fail-fast em producao para SESSION_SECRET ausente/fraco e autenticacao obrigatoria em rotas admin via requireAdminOrThrow.

## What Was Built

Fechamento de duas categorias de vulnerabilidade de seguranca:

1. **SESSION_SECRET fail-fast** — Em producao, se `SESSION_SECRET` nao estiver definido ou for o valor padrao `"dev-secret"`, os modulos `session.ts`, `middleware.ts` e `recibo-url.ts` lancam `Error` imediatamente no nivel de inicializacao do modulo (antes de qualquer request ser processado). Em desenvolvimento, o fallback `"dev-secret"` continua funcionando normalmente.

2. **requireAdminOrThrow** — Nova funcao em `guards.ts` que lanca excecao em vez de retornar `false`, tornando impossivel ignorar o resultado por engano. A funcao original `requireAdmin()` foi preservada para retrocompatibilidade.

3. **Admin backfill-estoque protegido** — Rotas GET e POST de `/api/admin/backfill-estoque` agora verificam sessao admin antes de executar qualquer logica de negocio, retornando 401 para requests nao autenticados ou sem role admin.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SESSION_SECRET fail-fast e requireAdminOrThrow | 980142a | session.ts, middleware.ts, recibo-url.ts, guards.ts |
| 2 | Proteger rota admin backfill-estoque | 790f869 | src/app/api/admin/backfill-estoque/route.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `grep -rn "dev-secret" src/lib/session.ts src/middleware.ts src/lib/recibo-url.ts` — "dev-secret" aparece apenas dentro de `rawSecret || "dev-secret"` (fallback protegido), nunca como atribuicao direta sem guarda.
- `grep -n "requireAdminOrThrow" src/lib/guards.ts` — exportada na linha 11.
- `grep -n "getSession" src/app/api/admin/backfill-estoque/route.ts` — 3 ocorrencias (1 import + 2 verificacoes em GET/POST).
- Todas as rotas admin verificadas: nenhuma sem guarda de autenticacao.

## Self-Check: PASSED

- [x] src/lib/session.ts modificado com fail-fast (commit 980142a)
- [x] src/middleware.ts modificado com fail-fast (commit 980142a)
- [x] src/lib/recibo-url.ts modificado com fail-fast (commit 980142a)
- [x] src/lib/guards.ts exporta requireAdminOrThrow (commit 980142a)
- [x] src/app/api/admin/backfill-estoque/route.ts protegido (commit 790f869)
- [x] Todos admin routes tem auth guard
