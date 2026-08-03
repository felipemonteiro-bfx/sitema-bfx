---
schema_version: 1
open_count: 6
waived_count: 0
fixed_count: 0
total_count: 6
last_updated: 2026-08-03T19:25:05.843Z
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
  }
]
````
