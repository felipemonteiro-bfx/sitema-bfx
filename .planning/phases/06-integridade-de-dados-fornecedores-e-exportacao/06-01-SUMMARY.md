---
phase: 06-integridade-de-dados-fornecedores-e-exportacao
plan: 01
subsystem: database
tags: [prisma, postgresql, soft-delete, rbac, audit-log, next.js-server-actions]

requires: []
provides:
  - "Fornecedor.deletedAt no schema + migration escrita a mao (nao aplicada)"
  - "bulkDeleteFornecedores com requireAdminOrThrow() e exclusao logica (updateMany)"
  - "src/lib/fornecedor-import.ts — modulo puro classificarNomeFornecedor/normalizarNomeFornecedor"
  - "addFornecedor com reativacao por nome (D-03) e auditoria create/restore (D-05)"
affects: [06-02-importador-csv-fornecedores, 06-03-demais-leituras-fornecedor-e-relatorios]

actuals:
  tokens: 4500
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Soft-delete via deletedAt DateTime? nullable + @@index([deletedAt]) — primeiro model do projeto com esse padrao"
    - "Modulo de dominio puro (zero imports) para permitir verificacao local via node --input-type=module quando vitest nao roda na maquina"
    - "Server action de page.tsx exportada + testada com vi.mock local (dbMock/guardsMock/auditMock), nunca importando o `prisma` real no teste (evita colisao de tipo no next build)"

key-files:
  created:
    - prisma/migrations/20260803180000_fornecedor_soft_delete/migration.sql
    - src/lib/fornecedor-import.ts
    - src/__tests__/fornecedor-soft-delete.test.ts
    - src/__tests__/fornecedor-nome-classificacao.test.ts
    - src/__tests__/fornecedor-rbac-auditoria.test.ts
  modified:
    - prisma/schema.prisma
    - src/app/(app)/cadastros/page.tsx

key-decisions:
  - "bulkDeleteFornecedores e addFornecedor foram exportados de page.tsx (antes eram funcoes locais nao exportadas) para serem importaveis pelos testes — mudanca mecanica, nao muda comportamento nem assinatura de uso interno."
  - "createAuditLog(fornecedor:create/fornecedor:restore) foi adicionado apenas na Task 3, mantendo a Task 2 focada exclusivamente na logica de classificacao/reativacao, conforme o plano descreve como 'unica mudanca de producao' da Task 3."

patterns-established:
  - "Primeiro soft-delete do projeto: deletedAt nullable, leituras de listagem filtram deletedAt: null, leituras de edicao usam findFirst (nao findUnique) quando o where combina coluna unica + deletedAt."

requirements-completed: [DAT-02]

coverage:
  - id: D1
    description: "Fornecedor.deletedAt no schema + migration SQL escrita a mao (D-02, DAT-02)"
    requirement: DAT-02
    verification:
      - kind: other
        ref: "node one-liner Task 1 <verify> — DAT-02 TRACER OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "bulkDeleteFornecedores exige admin via requireAdminOrThrow() antes de qualquer efeito; exclusao passa a ser updateMany (logica), nao deleteMany (D-04, D-02)"
    requirement: DAT-02
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-soft-delete.test.ts#Teste 1, Teste 2, Teste 3"
        status: unknown
      - kind: unit
        ref: "src/__tests__/fornecedor-rbac-auditoria.test.ts#Teste 1, Teste 2"
        status: unknown
      - kind: other
        ref: "node one-liner Task 1 <verify> — DAT-02 TRACER OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nome que existe soft-deletado reativa o registro (limpa deletedAt) em vez de tentar inserir e estourar o @unique de nome (D-03)"
    requirement: DAT-02
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-nome-classificacao.test.ts#Teste 4, Teste 6"
        status: unknown
      - kind: other
        ref: "node one-liner Task 2 <verify> — D-03 REATIVACAO OK"
        status: pass
    human_judgment: false
  - id: D4
    description: "Reativacao grava createAuditLog(fornecedor:restore, ...) e criacao grava fornecedor:create, distintas na trilha (D-05)"
    requirement: DAT-02
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-rbac-auditoria.test.ts#Teste 3, Teste 4"
        status: unknown
      - kind: other
        ref: "node one-liner Task 3 <verify> — D-04/D-05 AUDITORIA OK"
        status: pass
    human_judgment: true
    rationale: "Os 3 vitest suites (fornecedor-soft-delete, fornecedor-nome-classificacao, fornecedor-rbac-auditoria) nao rodam nesta maquina (sem node_modules, vitest: command not found — restricao ambiental documentada no plano). O gate real e o CI (.github/workflows/ci.yml -> npx vitest run). Status marcado unknown/human_judgment nos itens que dependem de vitest ate a primeira execucao no CI confirmar verde."

duration: 5min
completed: 2026-08-03
status: complete
---

# Phase 6 Plan 1: Soft-delete de Fornecedor com RBAC e Reativacao por Nome Summary

**Fatia vertical: `Fornecedor.deletedAt` no schema + migration manual, `bulkDeleteFornecedores` com `requireAdminOrThrow()` e exclusao logica via `updateMany`, e `src/lib/fornecedor-import.ts` (modulo puro) que reativa por nome em vez de estourar o `@unique`, com `fornecedor:create`/`fornecedor:restore` auditados.**

## Performance

- **Duration:** ~5 min (por timestamp de commit; sessao unica sem interrupcao)
- **Started:** 2026-08-03T18:00:47Z
- **Completed:** 2026-08-03T18:05:34Z
- **Tasks:** 3/3
- **Files modified:** 7 (2 modificados, 5 criados)

## Accomplishments

- `Fornecedor` ganhou `deletedAt DateTime? @map("deleted_at")` + `@@index([deletedAt])` no schema, com a migration correspondente escrita a mao em `prisma/migrations/20260803180000_fornecedor_soft_delete/migration.sql` (idempotente, **nao executada** — aplicada pelo `prisma migrate deploy` do `Dockerfile` no start do pod).
- `bulkDeleteFornecedores` fechou o buraco de RBAC (T-06-01/D-04): `requireAdminOrThrow()` e a primeira instrucao do corpo, antes de qualquer efeito. A exclusao deixou de ser `deleteMany` (destrutiva) e passou a ser `updateMany({ deletedAt: new Date() })`, com `where: { deletedAt: null }` tanto na leitura para auditoria quanto no update, para nao re-auditar/re-excluir quem ja estava excluido.
- `editFornecedorData` trocou `findUnique` por `findFirst` (a segunda leitura de fornecedor da pagina, alem da listagem) porque o `where` passou a combinar `id` com `deletedAt`, uma coluna nao-unica.
- A listagem da aba Fornecedores filtra `deletedAt: null` nos dois ramos (com e sem busca por nome).
- `src/lib/fornecedor-import.ts` — modulo puro (zero imports) com `normalizarNomeFornecedor` e `classificarNomeFornecedor`, contrato do qual o plano 06-02 depende.
- `addFornecedor` passou a carregar os fornecedores existentes e ramificar por `classificarNomeFornecedor`: `criar` (nome novo), `reativar` (nome soft-deletado — limpa `deletedAt`, D-03), `ignorar` (nome ja ativo) ou `erro` (nome vazio, retorno silencioso como hoje).
- Auditoria da restauracao (D-05/T-06-03): `addFornecedor` grava `createAuditLog("fornecedor:create", ...)` no ramo de criacao e `createAuditLog("fornecedor:restore", ...)` no ramo de reativacao — antes, nenhuma das duas acoes era auditada.
- Trava de regressao dedicada (`fornecedor-rbac-auditoria.test.ts`): se a guarda de admin sumir de `bulkDeleteFornecedores` no futuro, o teste falha checando a lista de metodos do Prisma efetivamente chamados (nao a mensagem de erro).

## Task Commits

Cada task seguiu RED (teste) -> GREEN (implementacao):

1. **Task 1: Fatia vertical — exclusao logica com guarda de admin**
   - `685fbbd` test(06-01): failing test for fornecedor soft-delete + RBAC guard
   - `640c188` feat(06-01): soft-delete de fornecedor com guarda de admin (D-02, D-04)
2. **Task 2: Reativacao por nome — modulo puro e cadastro sem estourar unique**
   - `f2438e4` test(06-01): failing test for fornecedor-import pure classification module
   - `2b9bf09` feat(06-01): reativacao por nome — modulo puro + cadastro sem estourar unique (D-03)
3. **Task 3: Trava de regressao — RBAC, trilha de auditoria da restauracao**
   - `d516542` test(06-01): failing regression test for RBAC + restauracao auditavel
   - `4edbb0b` feat(06-01): auditoria de criacao e restauracao de fornecedor (D-05)

## Files Created/Modified

- `prisma/schema.prisma` - `Fornecedor.deletedAt` + `@@index([deletedAt])`
- `prisma/migrations/20260803180000_fornecedor_soft_delete/migration.sql` - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS deleted_at` + `CREATE INDEX IF NOT EXISTS fornecedores_deleted_at_idx` (idempotente, nao executada)
- `src/lib/fornecedor-import.ts` - modulo puro `normalizarNomeFornecedor`/`classificarNomeFornecedor` (contrato para 06-02)
- `src/app/(app)/cadastros/page.tsx` - `bulkDeleteFornecedores` (RBAC + soft-delete, exportada), `editFornecedorData` (`findFirst`), listagem (`deletedAt: null`), `addFornecedor` (classificacao + auditoria, exportada)
- `src/__tests__/fornecedor-soft-delete.test.ts` - 4 casos: updateMany sem deleteMany, rejeicao de vendedor, where com deletedAt: null, auditoria fornecedor:delete
- `src/__tests__/fornecedor-nome-classificacao.test.ts` - 7 casos do modulo puro (normalizacao, nome vazio, ignorar/reativar/criar, insensibilidade a caixa/espaco)
- `src/__tests__/fornecedor-rbac-auditoria.test.ts` - 4 casos: trava de regressao RBAC (vendedor/admin) + auditoria create/restore distinguiveis

## Decisions Made

- `bulkDeleteFornecedores` e `addFornecedor` foram exportados de `page.tsx` (eram funcoes locais nao exportadas) para serem importaveis pelos testes unitarios — mudanca mecanica exigida para tornar o `<behavior>` do plano testavel; nao altera nenhuma assinatura usada pelos componentes client (`onAddAction`/`onBulkDeleteAction` continuam recebendo as mesmas funcoes).
- A auditoria de `fornecedor:create`/`fornecedor:restore` foi implementada exclusivamente na Task 3, mantendo a Task 2 focada so na logica de classificacao/reativacao — assim a Task 3 e de fato "unica mudanca de producao: os dois `createAuditLog`", como o plano descreve, o que manteve os commits atomicos alinhados as tasks.
- Mocks de teste seguem o padrao ja usado em `campanha-cota.test.ts`: objetos de mock locais (`dbMock`/`guardsMock`/`auditMock`) passados para `vi.mock`, nunca importando o `prisma`/`requireAdminOrThrow`/`createAuditLog` reais no arquivo de teste — evita colisao entre o tipo real do `PrismaClient` e o mock no `next build` (que roda `tsc` sobre todo o projeto, incluindo `src/__tests__`).

## Deviations from Plan

None - plano executado exatamente como escrito, incluindo as duas ressalvas do prompt: `editFornecedorData` foi trocado para `findFirst` (nao apenas as 5 leituras originalmente listadas no `06-CONTEXT.md`), e nenhum filtro `deletedAt: null` foi aplicado as leituras de classificacao em `addFornecedor` (o `findMany` de candidatos busca **todos** os fornecedores, ativos e soft-deletados, propositalmente — e assim que `classificarNomeFornecedor` enxerga os soft-deletados para reativar).

## Issues Encountered

- `npx prisma generate` foi tentado apos a edicao do schema (permitido e recomendado pelo plano, pois so regenera o client). Sem `node_modules` nesta maquina, `npx` tentou baixar `prisma@7.9.1` do zero e falhou ao carregar `prisma.config.ts` (`Cannot find module 'prisma/config'`) — consistente com a restricao de ambiente ja documentada (`npm install` proibido). Nao bloqueia a entrega: o CI roda `npx prisma generate` com `node_modules` completo antes do `vitest run`/`build` (`.github/workflows/ci.yml`).

## User Setup Required

**Rollout de imagem necessario para a coluna existir em producao.** A coluna `deleted_at` so passa a existir no banco quando a imagem nova sobe — o container roda `prisma migrate deploy` antes de `node server.js` (`Dockerfile:51`). Ate o rollout no namespace `bfx` (ArgoCD), `DAT-02` nao e verdade em producao mesmo com o codigo mergeado. Nenhuma acao de dashboard adicional alem do proprio rollout da imagem.

## Next Phase Readiness

- `src/lib/fornecedor-import.ts` esta pronto e e o contrato publico que o plano 06-02 (importador CSV) estende — nao renomear `AcaoFornecedor`, `FornecedorExistente`, `ClassificacaoNome`, `normalizarNomeFornecedor` ou `classificarNomeFornecedor` sem atualizar 06-02.
- `Fornecedor.deletedAt` esta no schema e a migration existe; 06-03 pode assumir a coluna ao fechar as demais leituras de fornecedor fora de `/cadastros` (`venda-rapida/page.tsx`, `relatorios/page.tsx`, `ai-actions.ts`, `db-search.ts`).
- Bloqueio conhecido: os 3 suites vitest desta plan ainda nao foram confirmados verdes (gate e o CI, nao esta maquina) — primeira execucao do CI apos o push deve ser conferida antes de considerar DAT-02 totalmente fechado.

---
*Phase: 06-integridade-de-dados-fornecedores-e-exportacao*
*Completed: 2026-08-03*

## Self-Check: PASSED

- Todos os 7 arquivos criados/modificados (`prisma/schema.prisma`, `prisma/migrations/20260803180000_fornecedor_soft_delete/migration.sql`, `src/lib/fornecedor-import.ts`, `src/app/(app)/cadastros/page.tsx`, `src/__tests__/fornecedor-soft-delete.test.ts`, `src/__tests__/fornecedor-nome-classificacao.test.ts`, `src/__tests__/fornecedor-rbac-auditoria.test.ts`) confirmados presentes em disco.
- Todos os 6 commits (`685fbbd`, `640c188`, `f2438e4`, `2b9bf09`, `d516542`, `4edbb0b`) confirmados em `git log --oneline --all`.
