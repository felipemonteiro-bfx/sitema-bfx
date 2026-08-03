---
phase: 05-storage-dur-vel-minio-no-cluster
verified: 2026-08-03T20:15:00Z
status: human_needed
score: 2/5 must-haves verified
behavior_unverified: 3
overrides_applied: 0
behavior_unverified_items:
  - truth: "Upload de logo e de imagens de produto grava efetivamente no MinIO em producao, nao mais em public/uploads (STO-01, STO-03)"
    test: "Em https://bfx.softlive.dev/configuracoes, aba Recibo, enviar um PNG real como logo."
    expected: "Resposta 200 (nao 503); a previa 'Logo atual' mostra a imagem; a URL persistida em Config.logoPath comeca com https://bfx.softlive.dev/produtos/logo/."
    why_human: "O codigo (guarda + writer + client S3) esta implementado e coberto por testes unitarios com mocks (CI verde no commit de merge), e a infraestrutura MinIO esta viva no cluster (pod Running, envs MINIO_* presentes no pod da app), mas nenhum upload real foi executado em producao ainda — os testes unitarios nao substituem essa prova empirica de escrita de fato no bucket."
  - truth: "Depois de um kubectl delete pod (app e MinIO) ou de um rollout do ArgoCD, o logo e as imagens de produto continuam acessiveis sem link quebrado (STO-01)"
    test: "kubectl -n bfx delete pod -l app=bfx-app; esperar Running; recarregar /configuracoes e /catalogo. Repetir com kubectl -n bfx delete pod -l app=bfx-minio."
    expected: "A logo continua aparecendo nos dois lugares apos os dois deletes — prova de que o PVC bfx-minio-data (nao o filesystem de um pod especifico) segura os objetos."
    why_human: "Este e o objetivo central da fase e depende de destruir e recriar pods reais no cluster de producao; nenhum grep ou teste unitario pode simular a garantia de persistencia de um PersistentVolumeClaim. Explicitamente documentado como pendente em REQUIREMENTS.md (STO-01 ainda `[ ]`) e no runbook de 05-04-SUMMARY.md (passo 6, 'se este passo falhar, a fase nao pode ser considerada concluida')."
  - truth: "O logo aparece corretamente no preview de configuracoes, no recibo em PDF e no catalogo (STO-05)"
    test: "Abrir /configuracoes (previa), /catalogo (cabecalho do PDF publico) e o PDF de um recibo existente, apos uma logo real ter sido enviada."
    expected: "Os tres lugares mostram a mesma imagem sem link quebrado; a URL inspecionada no navegador comeca com https://bfx.softlive.dev/produtos/logo/."
    why_human: "O codigo dos quatro helpers (embedLogoNoPdf, logoSrcParaBrowser) esta implementado, wired nos 7 pontos de leitura corretos, e coberto por testes unitarios (CI verde), mas a confirmacao visual com um logo real em producao ainda nao foi feita — depende do item STO-03 acima ter acontecido primeiro."
---

# Phase 5: Storage durável (MinIO no cluster) Verification Report

**Phase Goal:** Uploads (logo e imagens de produto) sobrevivem ao ciclo de vida dos pods no Kubernetes — persistidos em MinIO dentro do cluster, não mais no filesystem efêmero do pod.
**Verified:** 2026-08-03T20:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | MinIO está provisionado no cluster (Deployment + PVC + Service) no namespace `bfx`, com volume persistente (STO-02) | VERIFIED | `deploy/bfx/minio.yaml` defines Service `bfx-minio` (9000/9001), PVC `bfx-minio-data` (10Gi, `microk8s-hostpath`, prune-protected), Deployment `bfx-minio` (`strategy: Recreate`, health probes on `/minio/health/live`). Confirmed live in production per ground truth (pod Running, PVC Bound, both ExternalSecrets SecretSynced=True) and `.planning/REQUIREMENTS.md:24` now marks STO-02 `[x]` with production evidence dated 2026-08-03. |
| 2 | Upload de logo e de imagens de produto grava no MinIO (object storage), não mais em `public/uploads` no filesystem do pod (STO-01, STO-03) | PRESENT_BEHAVIOR_UNVERIFIED | Code path fully wired: `src/app/api/upload-logo/route.ts` and `src/app/api/produtos/upload/route.ts` both call `uploadToMinIO()` (`src/lib/minio.ts`) when `isMinIOConfigured()` is true, persist the returned absolute URL, and only fall back to disk outside production. Unit tests (`logo-storage-e2e.test.ts`, `produtos-upload-route.test.ts`) exercise these paths with mocks and CI is green on the merge commit. No real upload has been performed against the live MinIO bucket yet — `REQUIREMENTS.md:33` still marks STO-03 `[ ]` pending that empirical step. |
| 3 | Depois de um `kubectl delete pod` ou de um rollout do ArgoCD, o logo e as imagens de produto continuam acessíveis, sem link quebrado (STO-01) | PRESENT_BEHAVIOR_UNVERIFIED | PVC retention annotations (`argocd.argoproj.io/sync-options: Delete=false,Prune=false`, `helm.sh/resource-policy: keep`) are present in `deploy/bfx/minio.yaml`, matching the pattern used for the Postgres PVC. This is the mechanism that should make survival true, but the actual `kubectl delete pod` test has not been run. `REQUIREMENTS.md:19-22` explicitly frames STO-01 as open pending this proof; the task's own "known and accepted" framing confirms this is expected, not a regression. |
| 4 | Em produção, se o storage não estiver configurado, o upload falha com um erro explícito em vez de reportar sucesso sobre disco efêmero (STO-04) | VERIFIED | `deveRecusarUpload(env)` in `src/lib/storage-policy.ts` (pure function: `NODE_ENV === "production" && !storageConfigurado(env)`) is called as the first check in both upload routes, before any disk I/O, returning 503. Also guards the case where `uploadToMinIO` itself fails in production (`exigeStorageDuravel`), refusing rather than degrading to ephemeral disk. Covered by `upload-logo-route.test.ts` and `produtos-upload-route.test.ts`; CI green on the PR #36 merge commit (`lint-and-build` conclusion SUCCESS). This truth does not depend on live cluster state — it is pure application logic, verified by a passing CI test suite. |
| 5 | O logo aparece corretamente no preview de configurações, no recibo em PDF e no catálogo; o cron `cleanup-uploads` roda sobre o MinIO e nunca apaga um objeto ainda referenciado no banco (STO-05, STO-06) | PRESENT_BEHAVIOR_UNVERIFIED (display) / VERIFIED (cron) | **Display (STO-05):** `embedLogoNoPdf()` (`src/lib/logo-loader.ts`) is wired into all 4 PDF generators (`src/app/api/recibo/route.ts`, `src/app/api/catalogo/route.ts`, `src/lib/recibo-pdf.ts`, `src/lib/relatorio-mensal-pdf.ts`); `logoSrcParaBrowser()` (`src/lib/storage-policy.ts`) is wired into the 3 browser render points (`logo-upload-form.tsx`, `receipt-preview.tsx`, `catalogo/page.tsx`), fixing the pre-existing bug where an absolute URL was prefixed with a stray `/`. No `process.cwd`/`tryLoadImage` remnants remain in the PDF generators. Visual confirmation with a real uploaded logo has not been done (`REQUIREMENTS.md:35` STO-05 still `[ ]`). **Cron (STO-06):** `src/app/api/cron/cleanup-uploads/route.ts` only calls `cleanupMinIOPrefix("relatorios/mensal/", ...)`, never touching asset prefixes (`logo/`, product images); legacy `Config.logoPath` and `Produto.imagem` are excluded from the local-disk sweep via the `referenced` set. Covered by `cleanup-uploads-cron.test.ts` (5 cases including the "referenced legacy file is never removed" case); `REQUIREMENTS.md:36` marks STO-06 `[x]`. This sub-part does not require live cluster verification — the logic is fully testable and CI-green. |

**Score:** 2/5 truths verified, 3 present-but-behavior-unverified (all three concentrated on empirical proof of writing to / surviving the live MinIO cluster with a real object).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/storage-policy.ts` | Pure storage-policy module (zero imports) | VERIFIED | 76 lines, zero imports, exports `storageConfigurado`, `deveRecusarUpload`, `montarChaveLogo`, `resolverOrigemLogo`, `logoSrcParaBrowser`, `extensaoLogo`. No stubs. |
| `src/lib/logo-loader.ts` | `carregarLogo()` + `embedLogoNoPdf()` | VERIFIED | Handles both absolute URL (fetch) and legacy path (readFile); fail-closed to `null`. |
| `src/app/api/upload-logo/route.ts` | Production guard + MinIO write + URL persistence | VERIFIED | Guard before I/O, `uploadToMinIO`, `persistirLogoPath`, dev-only disk fallback. |
| `src/app/api/produtos/upload/route.ts` | Same guard applied to product image upload | VERIFIED | Identical guard pattern, MinIO write, dev-only fallback. |
| `src/app/api/cron/cleanup-uploads/route.ts` | Cron never deletes MinIO-referenced assets | VERIFIED | Only calls `cleanupMinIOPrefix` on `relatorios/mensal/`; local sweep respects `referenced` set built from `Produto.imagem` + `Config.logoPath`. |
| `src/lib/minio.ts` | S3-compatible client (`uploadToMinIO`, `isMinIOConfigured`, `cleanupMinIOPrefix`) | VERIFIED | Uses `@aws-sdk/client-s3` (already declared dependency), `forcePathStyle: true`, bucket auto-creation with public-read policy. |
| `deploy/bfx/minio.yaml` | Deployment + PVC + Service in namespace `bfx` | VERIFIED | Matches production ground truth exactly: Service `bfx-minio` ports 9000/9001, PVC `bfx-minio-data` 10Gi `microk8s-hostpath` with retention annotations, Deployment with `strategy: Recreate` and health probes. |
| `deploy/bfx/externalsecret-minio.yaml` | ExternalSecret sourced from AWS SSM | VERIFIED | `ClusterSecretStore: aws-ssm`, `dataFrom.extract` from `/softlive/bfx/prod/secrets/bfx-minio-secrets`, `deletionPolicy: Retain`. |
| `deploy/bfx/kustomization.yaml` | Registers both new manifests | VERIFIED | `minio.yaml` and `externalsecret-minio.yaml` present in `resources:`. |
| `deploy/bfx/ingress.yaml` | `/produtos` routes to `bfx-minio:9000`, console (9001) never exposed | VERIFIED | Path `/produtos` -> Service `bfx-minio` port `9000`, listed before catch-all `/`. No reference to port 9001 anywhere in the file. |
| 8 vitest test files (`storage-policy`, `logo-loader`, `logo-storage-e2e`, `upload-logo-route`, `logo-leitores-pdf`, `logo-src-browser`, `produtos-upload-route`, `cleanup-uploads-cron`) | Substantive test coverage per plan | VERIFIED (existence + CI pass) | All 8 files exist (858 lines total). `npx vitest run` does not execute on this verification machine (Yarn PnP, no `node_modules` — documented, accepted environment constraint), but CI (`lint-and-build`) is SUCCESS on the PR #36 merge commit `292c855`, and this includes the vitest run step per `.github/workflows/ci.yml`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `upload-logo/route.ts` | `storage-policy.deveRecusarUpload()` | Guard called before any disk write | WIRED | Line 29, before `writeFile`/`mkdir` calls. |
| `upload-logo/route.ts` | `minio.uploadToMinIO()` | MinIO write under `logo/` prefix | WIRED | `montarChaveLogo(file.name, Date.now())` -> `uploadToMinIO(buffer, chave, contentType)`. |
| `uploadToMinIO()` | `prisma.config.logoPath` | Absolute URL persisted | WIRED | `persistirLogoPath(url)` called on successful upload. |
| `Config.logoPath` | `logo-loader.carregarLogo()` | URL via fetch / legacy via readFile | WIRED | `resolverOrigemLogo()` branches correctly; verified by 6-case test suite. |
| `produtos/upload/route.ts` | `storage-policy.deveRecusarUpload()` | Same guard as logo route | WIRED | Line 21, identical pattern. |
| `cleanup-uploads/route.ts` | `minio.cleanupMinIOPrefix()` | Only `relatorios/mensal/` prefix, never asset prefixes | WIRED | Single call site, prefix hardcoded to reports, guarded by D-05 regression test. |
| `kustomization.yaml` | `minio.yaml` + `externalsecret-minio.yaml` | ArgoCD sync registration | WIRED | Both files listed in `resources:`. |
| `ingress.yaml` `/produtos` | Service `bfx-minio:9000` | Public read route | WIRED | Confirmed structurally and in production (ground truth: `https://bfx.softlive.dev/produtos/` returns MinIO's own 403, proving the Ingress reaches MinIO, not a 404/502 from Traefik). |
| 4 PDF generators | `logo-loader.embedLogoNoPdf()` | Single embed point | WIRED | `recibo/route.ts`, `catalogo/route.ts`, `recibo-pdf.ts`, `relatorio-mensal-pdf.ts` all import and call it; zero `process.cwd`/`tryLoadImage` remnants. |
| 3 browser components | `storage-policy.logoSrcParaBrowser()` | Single `src` resolution point | WIRED | `logo-upload-form.tsx`, `receipt-preview.tsx`, `catalogo/page.tsx` all import and use it in the `src=` prop. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `deveRecusarUpload` pure logic (STO-04 decision table) | Manual trace of `storage-policy.ts:14-24` against 3 scenarios (prod+no-vars, prod+vars, dev+no-vars) | prod+no-vars=true, prod+vars=false, dev+no-vars=false — matches expected STO-04 contract | PASS |
| `npx vitest run` (full suite) | N/A on this machine | Not executable (Yarn PnP, no `node_modules`; `npm install` forbidden per CLAUDE.md) | SKIP — substituted by CI evidence below |
| CI `lint-and-build` job on PR #36 merge commit `292c855` | `gh pr view 36 --json statusCheckRollup` | `conclusion: SUCCESS`, completed 2026-08-03T19:48:12Z | PASS |
| Debt-marker scan across all 17 phase-touched files | `grep -n -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` | No matches | PASS |

Per the task's explicit environment note, "vitest does not run on this machine... the test suites were verified by CI, which is green on the merge commit" — this is treated as sufficient behavioral evidence for the pure, cluster-independent logic (STO-04, STO-06), not as evidence for the three items that require a live MinIO bucket and a real pod-delete cycle (those remain PRESENT_BEHAVIOR_UNVERIFIED regardless of CI status, because CI mocks `@/lib/minio` and `@/lib/db` and cannot exercise real infrastructure).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| STO-01 | 05-02, 05-04 | Uploads sobrevivem a rollout do ArgoCD e recriação de pod | NEEDS HUMAN | Infra live (PVC bound, retention annotations present) but survival not empirically tested. `REQUIREMENTS.md:19` `[ ]`. |
| STO-02 | 05-02 | MinIO provisionado no cluster no namespace `bfx` | SATISFIED | Confirmed live in production per ground truth; `REQUIREMENTS.md:24` `[x]`. |
| STO-03 | 05-01 | Upload de logo grava no object storage, não no filesystem do pod | NEEDS HUMAN | Code complete and CI-tested; no real upload performed yet. `REQUIREMENTS.md:33` `[ ]`. |
| STO-04 | 05-01, 05-04 | Em produção, upload sem storage configurado falha explicitamente | SATISFIED | Guard implemented in both upload routes, CI-tested. `REQUIREMENTS.md:34` `[x]`. |
| STO-05 | 05-03 | Logo aparece no preview, recibo PDF e catálogo | NEEDS HUMAN | Code wired in all 7 read points; visual confirmation with a real logo pending. `REQUIREMENTS.md:35` `[ ]`. |
| STO-06 | 05-04 | Cron `cleanup-uploads` opera sobre o novo storage sem apagar objeto referenciado | SATISFIED | Logic scoped to report-only prefix, regression-tested, CI green. `REQUIREMENTS.md:36` `[x]`. |

No orphaned requirements — all six STO-* items declared in plan frontmatter (`requirements-completed`) match the six requirements ROADMAP.md maps to Phase 5, and REQUIREMENTS.md's checkbox state for every item agrees with the code-level evidence found above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/REQUIREMENTS.md` | 184 (Traceability table) | STO-01 listed as "Complete" in the Traceability table while its checkbox (line 19) is `[ ]` and its own SUMMARY/deferred-items.md documents this as a known, not-yet-fixed inconsistency | ℹ️ Info | Documentation-only; does not affect runtime behavior. Already self-reported in `.planning/phases/05-storage-dur-vel-minio-no-cluster/deferred-items.md` with a recommended fix (run `requirements mark-complete` once the human runbook is done). Not a code gap. |

No blocker- or warning-level anti-patterns found. No debt markers (`TBD`/`FIXME`/`XXX`), no placeholder returns, no hardcoded empty data flowing to render in any of the 17 files touched by this phase.

## Human Verification Required

### 1. Upload real de logo grava no MinIO (STO-03)

**Test:** Em `https://bfx.softlive.dev/configuracoes`, aba Recibo, escolher um PNG e clicar em "Enviar logo".
**Expected:** Resposta 200 (não 503); a prévia "Logo atual" mostra a imagem; a URL persistida em `Config.logoPath` começa com `https://bfx.softlive.dev/produtos/logo/`.
**Why human:** O código está implementado e testado com mocks (CI verde), e a infraestrutura MinIO está viva, mas nenhum upload real foi feito ainda contra o bucket de produção.

### 2. Sobrevivência ao ciclo de vida do pod (STO-01) — o objetivo central da fase

**Test:** `kubectl -n bfx delete pod -l app=bfx-app`, esperar `Running`, recarregar `/configuracoes` e `/catalogo`. Repetir com `kubectl -n bfx delete pod -l app=bfx-minio`.
**Expected:** A logo continua aparecendo nos dois lugares após os dois deletes.
**Why human:** Requer manipular pods reais no cluster de produção; nenhuma checagem estática ou teste unitário prova a garantia de persistência de um PVC sob recriação de pod. Se este item falhar, a fase inteira permanece em aberto independentemente dos demais itens.

### 3. Os três leitores mostram a logo corretamente (STO-05)

**Test:** Após o item 1 acima, abrir `/configuracoes` (prévia), `/catalogo` (PDF público) e o PDF de um recibo existente.
**Expected:** Os três lugares mostram a mesma imagem sem link quebrado; a URL inspecionada no navegador começa com `https://bfx.softlive.dev/produtos/logo/`.
**Why human:** Renderização visual em PDF e navegador não é verificável por grep/teste estático; depende de uma logo real já enviada (item 1).

## Gaps Summary

Não há gaps de código nesta fase. Todos os artefatos exigidos existem, são substantivos (não-stub), e estão corretamente conectados (upload -> MinIO -> persistência -> leitura, nos 4 geradores de PDF e nos 3 pontos de renderização no navegador). A guarda de produção (STO-04) e a trava de regressão do cron (STO-06) são lógica pura, cobertas por testes que passam no CI (verde no commit de merge `292c855`), e não dependem do cluster real para serem verdadeiras.

O que resta são três itens de **prova empírica em produção**, já reconhecidos pelo próprio time como pendentes (`REQUIREMENTS.md` STO-01/STO-03/STO-05 continuam `[ ]`, e `05-04-SUMMARY.md` documenta o runbook exato de 8 passos que o André precisa executar). Nenhum destes é um defeito de implementação — é trabalho de infraestrutura fora do escopo que um agente de código pode executar (proibição explícita de `kubectl`/`argocd`/`aws` neste ambiente). A fase está corretamente classificada como `human_needed`, não `gaps_found`.

---

_Verified: 2026-08-03T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
