---
phase: 05-storage-dur-vel-minio-no-cluster
plan: 01
subsystem: storage
tags: [minio, s3, next-api-route, logo-upload, vitest, tdd]

requires: []
provides:
  - "src/lib/storage-policy.ts — modulo puro de decisao (deveRecusarUpload, montarChaveLogo, resolverOrigemLogo, extensaoLogo)"
  - "src/lib/logo-loader.ts — carregarLogo() com suporte a URL absoluta (fetch) e caminho legado (readFile)"
  - "POST /api/upload-logo reescrito: guarda de producao antes de disco, grava no MinIO sob logo/, persiste URL absoluta"
affects: [05-02, 05-03, 05-04]

actuals:
  tokens: 4700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Modulo de politica 100% puro (zero imports) para permitir verificacao local via node --input-type=module fora do bundler"
    - "Guarda de producao (deveRecusarUpload) executada antes de qualquer I/O de disco na rota"

key-files:
  created:
    - src/lib/storage-policy.ts
    - src/lib/logo-loader.ts
    - src/__tests__/logo-storage-e2e.test.ts
    - src/__tests__/storage-policy.test.ts
    - src/__tests__/upload-logo-route.test.ts
    - src/__tests__/logo-loader.test.ts
  modified:
    - src/lib/minio.ts
    - src/app/api/upload-logo/route.ts

key-decisions:
  - "isMinIOConfigured() em minio.ts passou a delegar para storageConfigurado(process.env) — fonte unica de verdade compartilhada com a guarda de producao (D-01/STO-03)"
  - "logo-loader.ts implementado com os dois ramos (url e arquivo) ja na Task 1, em vez de so o ramo url como o plano descrevia para a Task 1 isoladamente — o contrato completo era trivial de fechar de uma vez e a Task 3 apenas adicionou o teste de regressao"

patterns-established:
  - "Guarda de producao antes de I/O: deveRecusarUpload(process.env) e a primeira checagem apos validar o campo file, antes de qualquer buffer/disk/network"

requirements-completed: [STO-03, STO-04]

coverage:
  - id: D1
    description: "Upload de logo grava no MinIO sob prefixo logo/ e persiste URL absoluta em Config.logoPath"
    requirement: "STO-03"
    verification:
      - kind: unit
        ref: "src/__tests__/logo-storage-e2e.test.ts#caminho feliz: upload grava sob logo/ no MinIO, persiste URL absoluta e carregarLogo() le de volta"
        status: unknown
    human_judgment: true
    rationale: "vitest nao roda localmente nesta maquina (ver environment_constraints do plano); o teste foi escrito e o CI (.github/workflows/ci.yml) e quem executa de fato. O tracer puro (storage-policy.ts) foi verificado localmente e passou, mas o caminho completo com mocks de @/lib/db e @/lib/minio so e comprovado no CI."
  - id: D2
    description: "Em producao sem MinIO configurado, POST /api/upload-logo responde erro explicito e nao escreve em disco"
    requirement: "STO-04"
    verification:
      - kind: unit
        ref: "src/__tests__/upload-logo-route.test.ts#producao sem nenhuma var MINIO: responde >=400 (503) com error e NAO chama writeFile"
        status: unknown
    human_judgment: true
    rationale: "Mesma limitacao de ambiente: vitest nao roda localmente aqui. O one-liner puro de deveRecusarUpload (a logica que a guarda usa) foi verificado e imprimiu STO-04 TABELA OK; a suite vitest completa e o gate do CI."
  - id: D3
    description: "Valores legados /uploads/... continuam resolvendo via readFile; URLs absolutas resolvem via fetch"
    requirement: "STO-04"
    verification:
      - kind: unit
        ref: "src/__tests__/logo-loader.test.ts (6 casos: url/fetch, legado/readFile, extensoes, null/vazio, fetch not-ok, ENOENT)"
        status: unknown
    human_judgment: true
    rationale: "Idem — suite vitest nao executavel localmente nesta maquina; o one-liner puro de resolverOrigemLogo/extensaoLogo foi verificado e imprimiu COMPAT D-01/D-03 OK."

duration: 25min
completed: 2026-08-03
status: complete
---

# Phase 5 Plan 1: Tracer ponta a ponta do logo (upload -> MinIO -> leitura) Summary

**Reescrita de `POST /api/upload-logo` para gravar no MinIO sob o prefixo `logo/`, persistir URL absoluta em `Config.logoPath`, recusar upload explicitamente em producao sem storage configurado (503, sem tocar disco), e um `logo-loader.ts` que le tanto a URL nova quanto o caminho legado `/uploads/...`.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-03T15:05:00Z (aprox.)
- **Completed:** 2026-08-03T15:30:13Z
- **Tasks:** 3/3
- **Files modified:** 8 (2 criados em src/lib, 4 testes novos, 2 modificados)

## Accomplishments
- `src/lib/storage-policy.ts` — modulo 100% puro (zero imports) que centraliza toda a decisao de storage: `storageConfigurado`, `exigeStorageDuravel`, `deveRecusarUpload`, `sanitizarNomeArquivo`, `montarChaveLogo`, `ehUrlAbsoluta`, `resolverOrigemLogo`, `extensaoLogo`.
- `src/lib/logo-loader.ts` — `carregarLogo()` resolve URL absoluta via `fetch` (fail-closed em `!res.ok`) e caminho legado via `readFile`, ambos com falha silenciosa (`null`) porque a logo e sempre opcional.
- `src/lib/minio.ts` — `isMinIOConfigured()` agora delega para `storageConfigurado(process.env)`, eliminando a duplicacao da condicao das tres vars `MINIO_*`.
- `src/app/api/upload-logo/route.ts` reescrito na ordem exigida pelo plano: valida `file` -> guarda de producao (503 antes de qualquer I/O) -> tenta MinIO (grava sob `logo/`, persiste URL absoluta, responde 200) -> se MinIO falhar em producao, 503 -> fallback de disco so fora de producao.
- 4 arquivos de teste novos cobrindo o caminho feliz ponta a ponta, a tabela de decisao de STO-04, a recusa explicita na rota, e a compatibilidade retroativa do `logoPath` legado.

## Task Commits

Each task was committed atomically:

1. **Task 1: Caminho ponta a ponta — upload da logo no MinIO e leitura de volta** - `83f2255` (feat)
2. **Task 2: Recusa explicita em producao sem storage (STO-04)** - `c0bb0b4` (test)
3. **Task 3: Compatibilidade retroativa do logoPath legado (D-01, D-03)** - `70fbf24` (test)

**Plan metadata:** (proximo commit — docs, ver secao de estado abaixo)

_Nota: Tasks 2 e 3 nao precisaram tocar codigo de producao — a Task 1 ja fechou o contrato completo de `logo-loader.ts` e a guarda de producao em `route.ts`; os commits dessas tasks sao exclusivamente os testes de regressao que o plano definiu como entregavel._

## Files Created/Modified
- `src/lib/storage-policy.ts` - Modulo puro de politica de storage (zero imports) — decide recusa em producao, monta chave `logo/<ts>-<nome>`, resolve URL vs. legado, extrai extensao
- `src/lib/logo-loader.ts` - `carregarLogo()`: URL absoluta -> fetch; caminho legado -> readFile; falha sempre devolve null
- `src/lib/minio.ts` - `isMinIOConfigured()` delega para `storageConfigurado(process.env)`
- `src/app/api/upload-logo/route.ts` - Guarda de producao antes de disco; grava no MinIO sob `logo/`; persiste URL absoluta; fallback de disco so fora de producao
- `src/__tests__/logo-storage-e2e.test.ts` - Caminho feliz ponta a ponta (upload -> MinIO -> Config.logoPath -> carregarLogo) + 400 sem arquivo
- `src/__tests__/storage-policy.test.ts` - Tabela de decisao pura de todas as funcoes do modulo
- `src/__tests__/upload-logo-route.test.ts` - Producao sem MinIO -> 503 sem `writeFile`; dev sem MinIO -> 200 com `writeFile`
- `src/__tests__/logo-loader.test.ts` - 6 casos: url/fetch, legado/readFile, extensoes variadas, null/vazio, fetch not-ok, ENOENT

## Decisions Made
- `isMinIOConfigured()` passou a delegar para `storageConfigurado(process.env)` em vez de duplicar a checagem das tres vars `MINIO_*` — mantem uma unica fonte de verdade entre `minio.ts` e a guarda de producao da rota.
- `logo-loader.ts` foi implementado com o contrato completo (ramo `url` e ramo `arquivo`) ja na Task 1, em vez de deixar o ramo `arquivo` so para a Task 3 como o plano descrevia. O contrato inteiro (`resolverOrigemLogo` + `extensaoLogo`, ja definidos na Task 1) tornava o segundo ramo trivial de fechar junto; a Task 3 seguiu como planejado no papel de gate de regressao (escreveu `logo-loader.test.ts` cobrindo os 6 casos, sem precisar alterar codigo).

## Deviations from Plan

None (nenhuma mudanca de codigo de producao alem do que o plano especificou) — a unica nota e a antecipacao descrita acima em "Decisions Made", que nao altera comportamento nem escopo, apenas o momento em que o codigo foi escrito.

## Issues Encountered
- Confirmado localmente (como o plano ja antecipava): `npx vitest run` falha neste ambiente com `Cannot find module 'vitest/config'` (Yarn PnP sem `node_modules`, `.pnp.cjs` desatualizado). Os 4 arquivos de teste foram escritos seguindo o TDD exigido pelo CLAUDE.md e ficam como gate do CI (`.github/workflows/ci.yml` -> `npx vitest run`), mas nao puderam ser executados localmente. A verificacao local possivel — os tres one-liners `node --input-type=module` do plano, que exercitam `storage-policy.ts` (modulo sem imports) — rodou com sucesso nas tres tasks: `TRACER OK logo/1700000000000-Minha-Logo.PNG`, `STO-04 TABELA OK`, `COMPAT D-01/D-03 OK`.

## User Setup Required
None - nenhuma configuracao externa nova requerida por este plano (as credenciais MinIO via ExternalSecret sao escopo do plano 05-02).

## Next Phase Readiness
- Contrato publico de `storage-policy.ts` e `logo-loader.ts` esta fechado e estavel para os planos 05-03 (leitores de logo em `catalogo`, `configuracoes`, `recibo`) e 05-04, que dependem destas assinaturas (ver `<interface_contract>` do plano).
- Bloqueador para validacao end-to-end real: nao ha MinIO no cluster ainda (dependencia do plano 05-02, infraestrutura). Os testes desta plan mockam `@/lib/minio` e `@/lib/db`, entao nao dependem do cluster, mas a confirmacao final (comportamento real em producao) so acontece apos 05-02 subir o MinIO e o CI rodar a suite completa.

---
*Phase: 05-storage-dur-vel-minio-no-cluster*
*Completed: 2026-08-03*

## Self-Check: PASSED

Todos os 6 arquivos de codigo/teste criados e o proprio SUMMARY.md foram confirmados presentes no filesystem; os 3 hashes de commit (`83f2255`, `c0bb0b4`, `70fbf24`) foram confirmados presentes em `git log --oneline --all`.
