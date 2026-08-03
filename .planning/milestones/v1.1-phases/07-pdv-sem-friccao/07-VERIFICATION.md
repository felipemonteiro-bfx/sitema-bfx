---
phase: 07-pdv-sem-friccao
verified: 2026-08-03T20:17:25Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Depois do rollout: abrir o PDV, clicar em \"Cadastrar cliente\", preencher nome + telefone + empresa parceira, salvar, e confirmar que o cliente aparece selecionado na venda e que a empresa parceira aparece corretamente vinculada na aba Clientes de /cadastros."
    expected: "Cliente criado fica selecionado no PDV sem nova busca; vinculo de empresa parceira aparece correto em /cadastros."
    why_human: "Comportamento de UI/fluxo em runtime real, apos deploy — nao ha node_modules nesta maquina para subir a aplicacao e exercitar visualmente."
  - test: "Depois do rollout: no modal de cadastro rapido, digitar o nome de um cliente que ja existe e confirmar que aparece o aviso de nome parecido, que o botao de cadastrar continua habilitado, e que cadastrar um nome exatamente igual devolve mensagem legivel (nao erro tecnico do banco)."
    expected: "Aviso de nome parecido aparece sem bloquear o botao; conflito exato devolve mensagem legivel (409)."
    why_human: "Depende de debounce/fetch em runtime do navegador, nao verificavel por grep estatico."
  - test: "Depois do rollout: excluir um fornecedor pela aba Fornecedores de /cadastros, depois cadastrar o mesmo nome pelo PDV (cadastro rapido de produto) e confirmar que ele volta a existir, ja selecionado, sem mensagem de erro — e que a trilha em audit_logs mostra a restauracao, nao uma criacao nova."
    expected: "Fornecedor reativado (nao duplicado), selecionado automaticamente, audit_logs registra fornecedor:restore."
    why_human: "Requer soft-delete real + novo POST em ambiente rodando com banco; nao reproduzivel via leitura estatica de codigo."
  - test: "Depois do rollout: com a sessao expirada (logout em outra aba), tentar cadastrar um fornecedor pelo PDV e confirmar que a tela mostra mensagem de nao autenticado em vez de erro tecnico ou tela branca."
    expected: "Toast/erro legivel de sessao expirada, sem tela branca ou stack trace."
    why_human: "Comportamento de UI em resposta a 401 em runtime real do navegador."
---

# Phase 7: PDV sem fricção Verification Report

**Phase Goal:** Vendedor completa uma venda do início ao fim sem sair da tela do PDV — custo editável sem bloqueio de servidor, cliente e fornecedor cadastráveis inline.
**Verified:** 2026-08-03T20:17:25Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Vendedor pode lançar qualquer custo no item da venda rápida, inclusive abaixo do custo de catálogo, sem o servidor rejeitar a venda (PDV-14) | ✓ VERIFIED | `src/lib/venda-item-validation.ts` — cost-floor comparison removed entirely; `_catalogo` param kept only for signature compatibility and explicitly ignored (see docstring). |
| 2 | O valor de custo digitado pelo vendedor é gravado em `item_venda.custo_produto` exatamente como informado, sem piso de `custoPadrao` (PDV-14) | ✓ VERIFIED | `src/app/(app)/venda-rapida/actions.ts:200` calls `validarItensContraCatalogo(produtosValidados)` with a single argument (no catalog lookup feeding it); `src/lib/ai-actions.ts:844-851` (`criar_venda` branch) does the same, same module, same single-arg call. Neither caller queries `custoPadrao` before validation. |
| 3 | Vendedor pode cadastrar um cliente novo por modal sem sair da tela do PDV, e o cliente recém-criado já fica selecionado na venda (PDV-15) | ✓ VERIFIED (code) / pending interactive confirmation | `POST /api/clientes` exists (`src/app/api/clientes/route.ts`), requires session (401 first, before any Prisma call), translates `P2002` to 409 with readable message. `CadastrarClienteRapidoDialog` opens inline inside `venda-rapida-form-v2.tsx` (no navigation) and its `onCriado` callback sets `selectedCliente` directly (lines 811-829). Code-level wiring fully confirmed; live browser confirmation is pending UAT (see Human Verification). |
| 4 | Vendedor pode cadastrar um fornecedor novo dentro do fluxo de cadastro rápido de produto do PDV, e o fornecedor recém-criado já fica selecionado (PDV-16) | ✓ VERIFIED (code) / pending interactive confirmation | `POST /api/fornecedores` exists (`src/app/api/fornecedores/route.ts`), requires session, reactivates soft-deleted suppliers via `classificarNomeFornecedor` (Phase 6's `fornecedor-import.ts`) instead of re-inserting, handles the "already active" case without duplicate, and `P2002` maps to 409. `CadastrarFornecedorRapidoDialog` opens nested inside `cadastrar-produto-rapido-dialog.tsx`; `onCriado` calls `setFornecedorId(String(f.id))` (lines 305-315). Code-level wiring fully confirmed; live browser confirmation is pending UAT. |

**Score:** 4/4 truths verified at code level (0 present-but-behavior-unverified). Truths 3 and 4 additionally carry planner-deferred `<human-check>` items that require a running app post-rollout — these route to human verification per Step 8, not to a gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/venda-item-validation.ts` | Cost-floor rule (rule 2) gone, subtotal rule (rule 1) intact | ✓ VERIFIED | Function body only checks `subtotalEsperado` vs `item.subtotal`; no comparison against `custoPadrao` anywhere in file. |
| `src/__tests__/venda-item-validation.test.ts` | Cost-floor rejection cases flipped to acceptance, renamed | ✓ VERIFIED | Cases like "aceita custoProduto informado abaixo do custo cadastrado no catalogo (PDV-14, D-01: piso removido)" assert `toBeNull()`; no rejection case for below-floor cost remains. Subtotal rejection case (`rejeita quando subtotal nao bate...`) remains. |
| `src/__tests__/pdv-custo-livre.test.ts` | Regression lock documenting the business decision | ✓ VERIFIED | New file, 5 test cases, header comment cites commit `a63dc04`, D-01/D-03, and explicitly states the intent to fail if the floor is reintroduced. |
| `src/app/(app)/venda-rapida/actions.ts` | Caller updated to stop feeding catalog cost into validation | ✓ VERIFIED | Single-arg call at line 200; comment at 197-199 documents removal. |
| `src/lib/ai-actions.ts` | AI chat `criar_venda` branch updated identically | ✓ VERIFIED | Single-arg call at 844-850; comment documents removal. |
| `src/app/api/clientes/route.ts` | New `POST /api/clientes`, session-gated, P2002→409 | ✓ VERIFIED | File did not exist before phase; confirmed via `find` (only `similar` and `[id]/*` GET routes pre-existed). Session check precedes body parsing/Prisma calls. |
| `src/app/api/fornecedores/route.ts` | New `POST /api/fornecedores`, session-gated, reactivates soft-deleted | ✓ VERIFIED | File did not exist before phase (only this one file now under `api/fornecedores`). Reads `fornecedor.findMany` **without** filtering `deletedAt` (required for reactivation to trigger), routes to create/reativar/ignorar via `classificarNomeFornecedor`. |
| `src/components/cadastrar-cliente-rapido-dialog.tsx` | Modal, non-blocking similar-name warning | ✓ VERIFIED | `similares` state renders a warning block that never disables the submit button; submit handler is independent of `similares`. |
| `src/components/cadastrar-fornecedor-rapido-dialog.tsx` | Modal reachable from product quick-add | ✓ VERIFIED | Distinguishes `reativado`/`jaExistia`/created via different toast messages; calls `onCriado`. |
| `src/__tests__/cliente-rapido.test.ts`, `src/__tests__/clientes-post-route.test.ts`, `src/__tests__/fornecedores-post-route.test.ts` | New unit/route test suites | ✓ VERIFIED (existence + content) | 7 cases in clientes-post-route (401, 400, normalization, P2002→409, audit log, empresa parceira resolved server-side, unknown empresaParceiraId handled), 11 cases in fornecedores-post-route (401 + no writes, 400, create, audit create, reactivate, audit restore, already-active no-write, telefone trim both paths, RBAC lock, P2002→409 no raw error leak, generic 500 no raw error leak). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `venda-rapida/actions.ts` `criarVendaV2` | `venda-item-validation.validarItensContraCatalogo` | single-arg call | ✓ WIRED | Line 200, no catalog data passed. |
| `ai-actions.ts` `criar_venda` branch | `venda-item-validation.validarItensContraCatalogo` | single-arg call | ✓ WIRED | Lines 844-851, same module/rule. |
| `venda-rapida-form-v2.tsx` | `CadastrarClienteRapidoDialog` → `POST /api/clientes` → `onCriado` → `setFormState({selectedCliente})` | inline modal + callback | ✓ WIRED | Lines 811-829; dialog fetches `/api/clientes` internally, parent consumes `onCriado`. |
| `api/clientes/route.ts` | `cliente-rapido.montarPayloadClienteRapido` | pure validation module | ✓ WIRED | Line 32; module has zero imports as required for local verification. |
| `api/clientes/route.ts` | `session.getSession` (401 gate) + `audit.createAuditLog(cliente:create)` | session-first pattern | ✓ WIRED | Session checked at top before any body read; audit log call at line 67. |
| `cadastrar-produto-rapido-dialog.tsx` | `CadastrarFornecedorRapidoDialog` → `POST /api/fornecedores` → `onCriado` → `setFornecedorId` | nested modal + callback | ✓ WIRED | Lines 305-315. |
| `api/fornecedores/route.ts` | `fornecedor-import.classificarNomeFornecedor` | Phase 6 reuse | ✓ WIRED | Line 30; classification result drives create/reativar/ignorar branches; test `Teste 5`/`Teste 6` confirm reactivation calls `update`, not `create`. |
| `api/fornecedores/route.ts` | `session.getSession` (401) + `audit.createAuditLog(fornecedor:create \| fornecedor:restore)` | session-first pattern | ✓ WIRED | Session checked before body parse; distinct audit actions per branch (lines 42-45, 58-61). |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PDV-14 | 07-01-PLAN.md | Vendedor lança qualquer custo, gravado sem piso de catálogo | ✓ SATISFIED | Cost-floor rule removed from `venda-item-validation.ts`, both callers updated, regression lock test added. |
| PDV-15 | 07-02-PLAN.md | Cadastro de cliente inline no PDV, já selecionado | ✓ SATISFIED (code) | Route + modal + wiring confirmed; interactive confirmation pending UAT. |
| PDV-16 | 07-03-PLAN.md | Cadastro de fornecedor inline no PDV, com reativação de soft-delete | ✓ SATISFIED (code) | Route + modal + wiring + reactivation-over-recreation confirmed; interactive confirmation pending UAT. |

No orphaned requirements found — REQUIREMENTS.md maps exactly PDV-14/15/16 to Phase 7, and all three appear in the plans' `requirements` frontmatter.

### Anti-Patterns Found

None. Scanned all 15 files touched by this phase (`TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, `PLACEHOLDER`, stub-return patterns) — the only substring hits were `TODOS` (Portuguese "all") inside prose strings, not debt markers. No empty handlers, no static empty returns feeding rendered data, no hardcoded-empty props at call sites.

### Deliberate Risk (recorded, not a defect)

Removing the cost floor reopens the commission/margin-inflation vector that commit `a63dc04` closed (seller could under-report cost to inflate the margin/commission computed on a sale). It is freed for **all** sellers, not admin-only — an explicit decision by the user (D-03) made 2026-08-03 against the reviewing AI's recommendation. Recorded in `PROJECT.md` Key Decisions as `⚠️ Revisit`, and in the regression-lock test header (`pdv-custo-livre.test.ts`) and the `venda-item-validation.ts` docstring. No compensating mitigation (audit trail on cost edits, alerting) is in scope for this phase, matching the roadmap's explicit note. This is not flagged as a gap.

### Environment Note

`npm install` and `vitest` cannot run on this development machine (no `node_modules`, forbidden by CLAUDE.md). This was a known, documented constraint of all three plans. The real gate is CI: `git log` confirms commits `105896e`, `b549afa`/`f18e8e9`, `3b4613a` merged via PR #36 (merge commit `292c855`), and both `CI` and `Build → ECR → Deploy` GitHub Actions workflows completed with `success` on that merge commit and on the subsequent `nextjs-migration` push. This code is deployed to production. "Tests not run locally" is not treated as a gap.

### Human Verification Required

Four items were deliberately deferred from mid-plan `checkpoint:human-verify` to end-of-phase by the planner (07-02-PLAN.md and 07-03-PLAN.md, `<human-check>` blocks), because the interactive criteria for PDV-15/PDV-16 can only be exercised after the image rollout — this machine has no `node_modules` to run the app. All four are harvested here as pending UAT, not failures:

1. **Cliente rápido — seleção + vínculo de empresa parceira**
   **Test:** Abrir o PDV, clicar em "Cadastrar cliente", preencher nome + telefone + empresa parceira, salvar.
   **Expected:** Cliente aparece selecionado na venda; vínculo de empresa parceira aparece corretamente na aba Clientes de `/cadastros`.
   **Why human:** Fluxo de UI/runtime real pós-deploy, não observável por leitura estática.

2. **Cliente rápido — aviso de nome parecido não bloqueia**
   **Test:** No modal, digitar nome de cliente já existente; depois tentar cadastrar nome idêntico.
   **Expected:** Aviso aparece, botão de cadastrar continua habilitado; conflito exato devolve mensagem legível (não erro técnico).
   **Why human:** Depende de debounce/fetch em runtime de navegador.

3. **Fornecedor — reativação de soft-delete pelo PDV**
   **Test:** Excluir um fornecedor em `/cadastros`, depois cadastrar o mesmo nome pelo cadastro rápido de produto do PDV.
   **Expected:** Fornecedor volta a existir (reativado, não duplicado), já selecionado; `audit_logs` mostra `fornecedor:restore`, não uma criação nova.
   **Why human:** Requer soft-delete real + novo POST contra banco em execução.

4. **Fornecedor — sessão expirada**
   **Test:** Com sessão expirada (logout em outra aba), tentar cadastrar fornecedor pelo PDV.
   **Expected:** Mensagem de "não autenticado" legível, sem tela branca ou erro técnico.
   **Why human:** Comportamento de UI em resposta a 401 em runtime real.

### Gaps Summary

No gaps found. All four must-have truths are verified at the code level: the cost floor is fully removed with the subtotal rule intact, both callers (venda rápida and AI chat) share the same unguarded validation path, and both new API routes (`POST /api/clientes`, `POST /api/fornecedores`) exist, are session-gated, translate Prisma `P2002` into readable errors, and are wired end-to-end from modal to form-state selection. The supplier route correctly reactivates soft-deleted records instead of re-inserting. The only open items are four interactive UAT checks the planner explicitly deferred to post-rollout — these route to human verification, not to a gap, per the plans' own environment notes.

---

_Verified: 2026-08-03T20:17:25Z_
_Verifier: Claude (gsd-verifier)_
