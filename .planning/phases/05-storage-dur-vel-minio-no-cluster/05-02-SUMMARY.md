---
phase: 05-storage-dur-vel-minio-no-cluster
plan: 02
subsystem: infra
tags: [kubernetes, kustomize, minio, external-secrets, argocd, traefik]

# Dependency graph
requires:
  - phase: 05-01
    provides: "uploadToMinIO usage in upload-logo route, isMinIOConfigured() guard"
provides:
  - "MinIO Deployment + PVC + Service manifest in deploy/bfx/minio.yaml"
  - "ExternalSecret bfx-minio-secrets pointing at AWS SSM"
  - "kustomization.yaml wiring for both new manifests"
  - "Ingress path /produtos routing to bfx-minio:9000"
  - "SSM runbook in README.md and updated .env.example"
affects: ["05-03", "05-04"]

# Actuals (#2632)
actuals:
  tokens: 3132
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PVC retention annotations (argocd.argoproj.io/sync-options + helm.sh/resource-policy: keep) copied from postgres.yaml to protect new volumes"
    - "ExternalSecret pattern from commit e94fe79 (externalsecret-app.yaml) reused for a second Secret"
    - "reloader.stakater.com/auto annotation on Deployments whose envFrom secret can rotate via SSM"

key-files:
  created:
    - deploy/bfx/minio.yaml
    - deploy/bfx/externalsecret-minio.yaml
  modified:
    - deploy/bfx/kustomization.yaml
    - deploy/bfx/ingress.yaml
    - deploy/bfx/README.md
    - .env.example

key-decisions:
  - "Image tag kept at minio/minio:latest to mirror docker-compose.yml; pinning a RELEASE.* tag deferred to a follow-up once a running release is confirmed in-cluster (T-05-03, accepted risk)"
  - "Deployment uses strategy: Recreate (not RollingUpdate) because the PVC is ReadWriteOnce"
  - "Console (port 9001) is never exposed via Ingress or Service annotations that Traefik would pick up — only kubectl port-forward reaches it"

patterns-established:
  - "New PVCs needing prune-protection must carry both argocd.argoproj.io/sync-options: \"Delete=false,Prune=false\" and helm.sh/resource-policy: keep, matching postgres.yaml"

requirements-completed: [STO-01, STO-02]

coverage:
  - id: D1
    description: "MinIO Deployment, PersistentVolumeClaim (10Gi, retained), and Service exist as code in deploy/bfx/minio.yaml, targeting namespace bfx"
    requirement: STO-02
    verification:
      - kind: other
        ref: "grep-based structural verify in Task 1 <verify> — printed MANIFESTO_MINIO_OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "PVC bfx-minio-data carries the same retention annotations as the postgres PVC, protecting the volume from ArgoCD prune"
    requirement: STO-01
    verification:
      - kind: other
        ref: "grep-based structural verify in Task 1 <verify> (Delete=false,Prune=false + helm.sh/resource-policy: keep)"
        status: pass
    human_judgment: false
  - id: D3
    description: "MinIO credentials come from ExternalSecret bfx-minio-secrets pointing at AWS SSM, with zero secret values committed to git"
    verification:
      - kind: other
        ref: "grep-based structural verify in Task 2 <verify> — printed WIRING_OK; manual git diff credential scan for password|secret values"
        status: pass
    human_judgment: false
  - id: D4
    description: "kustomization.yaml registers minio.yaml and externalsecret-minio.yaml so ArgoCD syncs them"
    verification:
      - kind: other
        ref: "grep-based structural verify in Task 2 <verify> — printed WIRING_OK"
        status: pass
    human_judgment: false
  - id: D5
    description: "Ingress routes /produtos to bfx-minio:9000 (bucket objects reachable by browser) without exposing the 9001 admin console"
    verification:
      - kind: other
        ref: "grep-based structural verify in Task 2 <verify> — printed WIRING_OK (explicit failure if number: 9001 appears)"
        status: pass
    human_judgment: false
  - id: D6
    description: "README documents the SSM parameter shape and the five keys to add to bfx-app-secrets, with no secret values; .env.example documents the new production-fail behavior"
    verification:
      - kind: other
        ref: "grep-based structural verify in Task 3 <verify> — printed RUNBOOK_OK"
        status: pass
    human_judgment: false
  - id: D7
    description: "Actual cluster application of these manifests (PVC/Deployment/Service/ExternalSecret creation, SSM parameter creation, ArgoCD sync)"
    verification: []
    human_judgment: true
    rationale: "This plan is forbidden from running kubectl/argocd/kustomize; applying to the live cluster is explicitly deferred to the human checkpoint in plan 05-04."

duration: ~20min
completed: 2026-08-03
status: complete
---

# Phase 5 Plan 2: MinIO Kubernetes Manifests Summary

**Deployment + PVC + Service for MinIO in namespace `bfx`, ExternalSecret wired to AWS SSM, and an Ingress path `/produtos` exposing only the S3 API port — no cluster commands executed.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `deploy/bfx/minio.yaml`: Service `bfx-minio` (ports 9000/9001), PVC `bfx-minio-data` (10Gi, `microk8s-hostpath`, prune-protected like the postgres PVC), and Deployment `bfx-minio` (`strategy: Recreate`, `envFrom: bfx-minio-secrets`, Reloader annotation, health probes on `/minio/health/live`).
- `deploy/bfx/externalsecret-minio.yaml`: ExternalSecret materializing `bfx-minio-secrets` from AWS SSM parameter `/softlive/bfx/prod/secrets/bfx-minio-secrets`, following the exact pattern of `externalsecret-app.yaml` (commit `e94fe79`, decision D-04).
- `deploy/bfx/kustomization.yaml`: registered both new manifests so ArgoCD picks them up.
- `deploy/bfx/ingress.yaml`: added `/produtos` path (before `/`) routing to `bfx-minio:9000`, making `MINIO_PUBLIC_URL + MINIO_BUCKET` URLs reachable from the browser without exposing the admin console on 9001.
- `deploy/bfx/README.md`: new "MinIO (storage de uploads)" section documenting what the manifest creates, the new SSM parameter shape, the five keys to add to `bfx-app-secrets`, apply order, and the `/produtos` route restriction.
- `.env.example`: clarified that in production the upload now fails explicitly without `MINIO_*` vars (STO-04) instead of silently falling back to disk.

## Task Commits

Each task was committed atomically:

1. **Task 1: Manifesto do MinIO — Service, PVC e Deployment** - `b2d3883` (feat)
2. **Task 2: ExternalSecret, registro no kustomization e rota publica de leitura** - `b12f7c7` (feat)
3. **Task 3: Runbook das chaves SSM e documentacao das variaveis** - `efc1706` (docs)

_Note: an unrelated commit (`83f2255`, plan 05-01's tracer task) landed between Task 1 and Task 2 because 05-01 executed concurrently in the same wave — it touches only `src/**` and does not overlap with this plan's files._

## Files Created/Modified
- `deploy/bfx/minio.yaml` - Service + PVC + Deployment for MinIO, mirrors docker-compose.yml config
- `deploy/bfx/externalsecret-minio.yaml` - ExternalSecret for `bfx-minio-secrets`, SSM-backed
- `deploy/bfx/kustomization.yaml` - registers the two new manifests
- `deploy/bfx/ingress.yaml` - adds `/produtos` path to `bfx-minio:9000`
- `deploy/bfx/README.md` - MinIO runbook section (SSM parameter, keys, apply order, restriction)
- `.env.example` - updated MinIO block comment describing production-fail behavior

## Decisions Made
- Image tag stays `latest` to mirror `docker-compose.yml`; pinning a `RELEASE.*` tag is deferred (T-05-03, accepted risk, documented in-file) until André confirms a running release in-cluster.
- `strategy: Recreate` on the Deployment is required because the PVC is `ReadWriteOnce` — a `RollingUpdate` would deadlock waiting for a second pod to mount the same volume.
- Console port 9001 is deliberately never referenced in the Ingress; Task 2's verify explicitly fails if `number: 9001` appears there (T-05-06 mitigation).

## Deviations from Plan

None - plan executed exactly as written. All three `<verify>` commands passed (`MANIFESTO_MINIO_OK`, `WIRING_OK`, `RUNBOOK_OK`), and the diff scope check confirms each commit touches only `deploy/bfx/*` or `.env.example`.

## Issues Encountered
- The sandbox's `grep` is shimmed to `ugrep` via a shell function, which rejects patterns starting with `-` (e.g. `"- minio.yaml"`) unless invoked with `command grep` or a `--` separator. Worked around locally with `command grep` for my own verification re-runs; the plan's literal `<verify>` scripts as written (using plain `grep`) still ran and passed in this same shell, since their `-F` patterns don't start with a bare dash in the same way once escaped through `sh -c` — no change to committed files was needed, this only affected how I manually re-validated the wiring.

## User Setup Required

**External services require manual configuration** (documented inline in the plan's `user_setup` frontmatter and in `deploy/bfx/README.md`, section "MinIO (storage de uploads)"):
- Create AWS SSM SecureString parameter `/softlive/bfx/prod/secrets/bfx-minio-secrets` (sa-east-1) with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`.
- Add five keys to the existing `/softlive/bfx/prod/secrets/bfx-app-secrets` JSON: `MINIO_ENDPOINT=http://bfx-minio:9000`, `MINIO_BUCKET=produtos`, `MINIO_PUBLIC_URL=https://bfx.softlive.dev`, `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` (same values as the root user/password above).
- Sync the `bfx` application in ArgoCD to create the PVC, Deployment, Service, and ExternalSecret.

This is explicitly out of scope for this plan (no `kubectl`/`argocd` commands were run) and is deferred to the human checkpoint in plan 05-04.

## Next Phase Readiness
- The manifests and wiring are ready for cluster application; no code in this plan needs further changes.
- Plan 05-04 (or wherever the phase's human checkpoint lives) should verify: SSM values created, ArgoCD sync succeeds, MinIO pod becomes Ready, and `https://bfx.softlive.dev/produtos/...` serves an uploaded object.
- No blockers for 05-03 (any remaining application-code plan in this phase) — this plan's file set does not overlap with `src/**`.

---
*Phase: 05-storage-dur-vel-minio-no-cluster*
*Completed: 2026-08-03*

## Self-Check: PASSED

All created/modified files confirmed present on disk (`deploy/bfx/minio.yaml`, `deploy/bfx/externalsecret-minio.yaml`, `deploy/bfx/kustomization.yaml`, `deploy/bfx/ingress.yaml`, `deploy/bfx/README.md`, `.env.example`, this SUMMARY.md). All three task commit hashes (`b2d3883`, `b12f7c7`, `efc1706`) confirmed present in git history.
