---
schema_version: 1
open_count: 12
waived_count: 0
fixed_count: 0
total_count: 12
last_updated: 2026-08-11T14:03:32.789Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 5 | unrun-verify | src/__tests__/produtos-upload-route.test.ts |  | vitest nao roda localmente (Yarn PnP sem node_modules); suite completa e gate exclusivo do CI | open |  | 2026-08-03T17:21:59.450Z |  |
| 2 | 5 | unrun-verify | src/__tests__/cleanup-uploads-cron.test.ts |  | vitest nao roda localmente (Yarn PnP sem node_modules); suite completa e gate exclusivo do CI | open |  | 2026-08-03T17:21:59.593Z |  |
| 3 | 5 | deviation | .planning/phases/05-storage-dur-vel-minio-no-cluster/05-04-PLAN.md |  | Task 3 (checkpoint humano no cluster: SSM, ArgoCD, kubectl delete pod) nao executada pelo agente — runbook pendente em 05-04-SUMMARY.md | open |  | 2026-08-03T17:21:59.740Z |  |
| 4 | 09 | unrun-verify | src/__tests__/uber-quote-result.test.ts |  | npx vitest run nao roda nesta maquina (sem node_modules); gate real e o CI. Logica coberta pelo node one-liner do plano 09-01, mas a suite vitest nao foi executada localmente. | open |  | 2026-08-03T19:25:05.691Z |  |
| 5 | 09 | unrun-verify | src/__tests__/uber-status-prontidao.test.ts |  | npx vitest run nao roda nesta maquina (sem node_modules); gate real e o CI. Logica coberta pelo node one-liner do plano 09-01, mas a suite vitest nao foi executada localmente. | open |  | 2026-08-03T19:25:05.763Z |  |
| 6 | 09 | unrun-verify | src/__tests__/uber-cotacao-nao-bloqueia-venda.test.ts |  | npx vitest run nao roda nesta maquina (sem node_modules); gate real e o CI. Logica coberta pelo node one-liner do plano 09-01, mas a suite vitest nao foi executada localmente. | open |  | 2026-08-03T19:25:05.843Z |  |
| 7 | quick-260811-coa | unrun-verify | src/lib/relatorio-vendas-colunas.ts |  | npx vitest/tsc/eslint indisponiveis neste ambiente (node_modules ausente, npm install falha por permissao) — verificacao automatizada nao rodou localmente; CI e o gate real. Verificacao manual extensiva de tipos e logica foi feita (ver SUMMARY). | open |  | 2026-08-11T13:45:17.987Z |  |
| 8 | quick-260811-coa | todo | src/app/api/relatorios/vendas/pdf/route.ts | 89 | Cabecalho da tabela (labelCurto por coluna) e desenhado uma unica vez antes do loop de vendas; paginas seguintes apos quebra de pagina (if y<50) saem sem cabecalho. Pre-existente (confirmado no commit 6db8f0c, antes desta task) — plano Task 2 ponto 6 travou 'manter o comportamento de quebra de pagina como estao'. Achado pelo review por subagente (code-review) desta task; nao corrigido por estar fora do escopo travado. | open |  | 2026-08-11T13:49:25.287Z |  |
| 9 | quick-260811-cym | unrun-verify | src/__tests__/login-migracao-senha.test.ts |  | vitest nao roda neste ambiente (sem node_modules, D-07); teste revisado manualmente linha a linha, nao executado | open |  | 2026-08-11T14:03:32.618Z |  |
| 10 | quick-260811-cym | unrun-verify | src/__tests__/escritas-senha.test.ts |  | vitest nao roda neste ambiente (zod/uuid ausentes, D-07); teste revisado manualmente linha a linha, nao executado | open |  | 2026-08-11T14:03:32.676Z |  |
| 11 | quick-260811-cym | unrun-verify | src/__tests__/senha-actions.test.ts |  | vitest nao roda neste ambiente (jose/next-headers ausentes, D-07); teste revisado manualmente linha a linha, nao executado | open |  | 2026-08-11T14:03:32.734Z |  |
| 12 | quick-260811-cym | deviation | src/lib/ai-actions.ts |  | criar_usuario (IA) nao aplica toLowerCase() no username -- follow-up registrado, nao implementado (fora de D-06) | open |  | 2026-08-11T14:03:32.789Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "5",
    "file": "src/__tests__/produtos-upload-route.test.ts",
    "line": null,
    "description": "vitest nao roda localmente (Yarn PnP sem node_modules); suite completa e gate exclusivo do CI",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-03T17:21:59.450Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "5",
    "file": "src/__tests__/cleanup-uploads-cron.test.ts",
    "line": null,
    "description": "vitest nao roda localmente (Yarn PnP sem node_modules); suite completa e gate exclusivo do CI",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-03T17:21:59.593Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "5",
    "file": ".planning/phases/05-storage-dur-vel-minio-no-cluster/05-04-PLAN.md",
    "line": null,
    "description": "Task 3 (checkpoint humano no cluster: SSM, ArgoCD, kubectl delete pod) nao executada pelo agente — runbook pendente em 05-04-SUMMARY.md",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-03T17:21:59.740Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "09",
    "file": "src/__tests__/uber-quote-result.test.ts",
    "line": null,
    "description": "npx vitest run nao roda nesta maquina (sem node_modules); gate real e o CI. Logica coberta pelo node one-liner do plano 09-01, mas a suite vitest nao foi executada localmente.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-03T19:25:05.691Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "09",
    "file": "src/__tests__/uber-status-prontidao.test.ts",
    "line": null,
    "description": "npx vitest run nao roda nesta maquina (sem node_modules); gate real e o CI. Logica coberta pelo node one-liner do plano 09-01, mas a suite vitest nao foi executada localmente.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-03T19:25:05.763Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "09",
    "file": "src/__tests__/uber-cotacao-nao-bloqueia-venda.test.ts",
    "line": null,
    "description": "npx vitest run nao roda nesta maquina (sem node_modules); gate real e o CI. Logica coberta pelo node one-liner do plano 09-01, mas a suite vitest nao foi executada localmente.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-03T19:25:05.843Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "quick-260811-coa",
    "file": "src/lib/relatorio-vendas-colunas.ts",
    "line": null,
    "description": "npx vitest/tsc/eslint indisponiveis neste ambiente (node_modules ausente, npm install falha por permissao) — verificacao automatizada nao rodou localmente; CI e o gate real. Verificacao manual extensiva de tipos e logica foi feita (ver SUMMARY).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T13:45:17.987Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "todo",
    "phase": "quick-260811-coa",
    "file": "src/app/api/relatorios/vendas/pdf/route.ts",
    "line": 89,
    "description": "Cabecalho da tabela (labelCurto por coluna) e desenhado uma unica vez antes do loop de vendas; paginas seguintes apos quebra de pagina (if y<50) saem sem cabecalho. Pre-existente (confirmado no commit 6db8f0c, antes desta task) — plano Task 2 ponto 6 travou 'manter o comportamento de quebra de pagina como estao'. Achado pelo review por subagente (code-review) desta task; nao corrigido por estar fora do escopo travado.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T13:49:25.287Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "unrun-verify",
    "phase": "quick-260811-cym",
    "file": "src/__tests__/login-migracao-senha.test.ts",
    "line": null,
    "description": "vitest nao roda neste ambiente (sem node_modules, D-07); teste revisado manualmente linha a linha, nao executado",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T14:03:32.618Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "unrun-verify",
    "phase": "quick-260811-cym",
    "file": "src/__tests__/escritas-senha.test.ts",
    "line": null,
    "description": "vitest nao roda neste ambiente (zod/uuid ausentes, D-07); teste revisado manualmente linha a linha, nao executado",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T14:03:32.676Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "quick-260811-cym",
    "file": "src/__tests__/senha-actions.test.ts",
    "line": null,
    "description": "vitest nao roda neste ambiente (jose/next-headers ausentes, D-07); teste revisado manualmente linha a linha, nao executado",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T14:03:32.734Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "quick-260811-cym",
    "file": "src/lib/ai-actions.ts",
    "line": null,
    "description": "criar_usuario (IA) nao aplica toLowerCase() no username -- follow-up registrado, nao implementado (fora de D-06)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T14:03:32.789Z",
    "resolved_at": null
  }
]
````
