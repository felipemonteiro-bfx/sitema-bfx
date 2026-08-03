---
phase: 06-integridade-de-dados-fornecedores-e-exportacao
verified: 2026-08-03T20:19:17Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Abrir /relatorios como admin e conferir a secao 'Exportacao Rapida (PDF)'"
    expected: "O botao 'Gimam' nao aparece mais (nao existe como EmpresaParceira cadastrada). Aparecem 6 botoes: AMAZON FIVE, CLIENTE PF BFX SHOP, EQUILIBRIUM, MIRAX SEGURANCA, SEM EMPRESA, SOFT LIVE. Nenhum nome que coincida com um fornecedor aparece na lista."
    why_human: "Confirmacao visual em producao do render final; o rastreio de dados (DB -> montarEmpresaOptions -> JSX -> endpoint de PDF) foi confirmado por leitura de codigo e pelas 6 linhas reais de empresas_parceiras, mas ninguem clicou na tela ainda."
  - test: "Em /cadastros -> aba Fornecedores: criar 'FORNECEDOR TESTE 06', excluir, e cadastrar de novo com o mesmo nome"
    expected: "O segundo cadastro reativa o registro (sem erro de nome duplicado) e o fornecedor aparece uma unica vez na aba."
    why_human: "Fluxo de usuario ponta a ponta na UI real; o caminho de codigo (addFornecedor -> classificarNomeFornecedor -> reativar) esta coberto por teste unitario e CI verde, mas o clique real em producao ainda nao foi feito."
  - test: "Logar com usuario de perfil vendedor e tentar excluir um fornecedor em /cadastros"
    expected: "A acao e recusada (RBAC bloqueia o vendedor)."
    why_human: "Confirmacao de sessao/role real em producao; a guarda requireAdminOrThrow() esta confirmada no codigo e em teste unitario (CI verde), mas o teste de sessao real de um vendedor ainda nao foi feito."
  - test: "Em /importacao/fornecedores: baixar 'modelo-fornecedores.csv', preencher 2-3 nomes, subir (dry-run), confirmar, e subir o MESMO arquivo de novo"
    expected: "No dry-run, os contadores mostram o que vai acontecer sem gravar nada. Apos confirmar, a segunda subida do mesmo arquivo cai inteira em 'ignorados' e o total de fornecedores nao muda."
    why_human: "Fluxo de upload de arquivo real via navegador; a logica (parseCsvFornecedores + planejarImportacaoFornecedores, sem escrita no dry-run, commit idempotente) esta coberta por 3 suites de teste e CI verde, mas o upload real ainda nao foi exercitado por um humano. Nota adicional do verificador: a tela so e alcancavel digitando a URL diretamente — nao ha link em nenhum menu do app apontando para ela (ver Anti-Patterns)."
  - test: "Abrir /venda-rapida e conferir o seletor de fornecedor no cadastro rapido de produto ANTES de recriar o 'FORNECEDOR TESTE 06' do passo 2 (enquanto ainda esta excluido)"
    expected: "'FORNECEDOR TESTE 06' excluido nao aparece na lista do seletor do PDV."
    why_human: "Comportamento de UI dependente de estado (fornecedor excluido some da lista); o filtro deletedAt: null esta confirmado no codigo do PDV, mas a ordem de passos (excluir -> checar PDV -> so entao recriar) exige um humano seguindo a sequencia certa."
---

# Phase 6: Integridade de dados: fornecedores e exportação Verification Report

**Phase Goal:** O cadastro de fornecedores volta a ser populável e deixa de ser destrutível sem rede de proteção, e a exportação rápida reflete as empresas parceiras reais do banco.
**Verified:** 2026-08-03T20:19:17Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Existe um importador de fornecedores por CSV com dry-run (reporta criados/ignorados/erros antes de escrever) e commit idempotente por nome (DAT-01) | VERIFIED | `src/lib/fornecedor-import.ts` (`parseCsvFornecedores`, `planejarImportacaoFornecedores`), `src/app/(app)/importacao/fornecedores/actions.ts` — `analisarImportacaoFornecedores` faz apenas leitura (`findMany`) e nenhuma escrita; `confirmarImportacaoFornecedores` recalcula o plano no servidor a partir do texto bruto, so escreve para `criar`/`reativar` (itens `ignorar` nao geram nenhuma chamada Prisma, o que torna a segunda subida do mesmo arquivo inofensiva). 3 suites de teste unitário cobrem parser/commit/robustez; CI verde no commit de merge (`292c855`, PR #36). Ressalva: rota funcional mas sem link de navegacao em nenhum menu (ver Anti-Patterns). |
| 2 | Excluir um fornecedor deixa de ser destrutivo sem rede de proteção — soft-delete + confirmação reforçada + RBAC substituem o hard delete (DAT-02) | VERIFIED | `bulkDeleteFornecedores` (`cadastros/page.tsx:235`) chama `requireAdminOrThrow()` como primeira instrucao do corpo (antes de qualquer efeito), e usa `updateMany({ deletedAt: new Date() })` em vez de `deleteMany`. UI (`fornecedores-tab-client.tsx:182-206`) tem `AlertDialog` de confirmação antes de disparar a exclusão. `requireAdminOrThrow` de fato lança erro para sessão nao-admin (`guards.ts:11-16`). Teste de regressão dedicado (`fornecedor-rbac-auditoria.test.ts`) verifica, por lista de métodos Prisma chamados, que nenhuma escrita ocorre quando a guarda rejeita. Migration `20260803180000_fornecedor_soft_delete` aplicada em produção (confirmado: coluna `deleted_at` existe em `fornecedores`, `finished_at` não-nulo). |
| 3 | Um fornecedor excluído por engano pode ser restaurado sem acesso direto ao banco de dados (DAT-02) | VERIFIED | `addFornecedor` (`cadastros/page.tsx:177-216`) classifica o nome via `classificarNomeFornecedor`: recadastrar um nome soft-deletado pelo formulário normal de "Adicionar Fornecedor" executa `update({ deletedAt: null })` em vez de tentar `create` (que estouraria o `@unique` de nome). O importador CSV (`confirmarImportacaoFornecedores`) também reativa por nome. Ambos os caminhos são acessíveis via UI, sem qualquer necessidade de acesso ao banco. Auditoria distingue `fornecedor:create` de `fornecedor:restore`. Coberto por `fornecedor-nome-classificacao.test.ts` e `fornecedor-rbac-auditoria.test.ts` (CI verde). |
| 4 | A tela de Exportação Rápida (Relatórios) exibe um botão por empresa parceira vinda do banco, sem lista hardcoded (`extraEmpresas`) no código (DAT-03) | VERIFIED | `relatorios/page.tsx` não contém mais nenhum array literal de nomes de empresa. `empresaOptions = montarEmpresaOptions(empresas, fornecedores)` (linha 27) monta a lista a partir de `prisma.empresaParceira.findMany()` e `prisma.fornecedor.findMany({ where: { deletedAt: null } })`. Cada botão aponta para `/api/relatorios/vendas/pdf?empresa=...`, cuja rota (`route.ts:25-74`) usa o parâmetro `empresa` para filtrar a query real (`{ equals: empresa, mode: "insensitive" }`) — dado flui de ponta a ponta, não é estático. Ground truth confirma 6 linhas reais em `empresas_parceiras` (`AMAZON FIVE`, `CLIENTE PF BFX SHOP`, `EQUILIBRIUM`, `MIRAX SEGURANÇA`, `SEM EMPRESA`, `SOFT LIVE`); `Gimam` não é uma delas, então o botão correspondente some — mudança esperada, não regressão, documentada no próprio SUMMARY do plano. |

**Score:** 4/4 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` (`model Fornecedor`) | `deletedAt DateTime?` + índice | VERIFIED | `deletedAt DateTime? @map("deleted_at")` + `@@index([deletedAt])` presentes (linhas 304-313) |
| `prisma/migrations/20260803180000_fornecedor_soft_delete/migration.sql` | Migration idempotente adicionando `deleted_at` | VERIFIED | `ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`; aplicada em produção (ground truth: coluna existe, `finished_at` não-nulo) |
| `src/lib/fornecedor-import.ts` | Módulo puro: classificação de nome + parser CSV + planejador | VERIFIED | Zero imports; exporta `classificarNomeFornecedor`, `normalizarNomeFornecedor`, `parseCsvFornecedores`, `planejarImportacaoFornecedores`, `LIMITE_LINHAS_IMPORT` |
| `src/app/(app)/importacao/fornecedores/actions.ts` | Server actions dry-run + commit, admin-only, recalcula no servidor | VERIFIED | `analisarImportacaoFornecedores` (só leitura) e `confirmarImportacaoFornecedores` (transação); ambas chamam `requireAdminOrThrow()` |
| `src/app/(app)/importacao/fornecedores/page.tsx` + `src/components/importacao-fornecedores-client.tsx` | Tela de upload com dry-run/commit | VERIFIED (existe e funciona) / ⚠️ ORPHANED (navegação) | Página renderiza corretamente e está guardada por `requireAdmin()`, mas nenhum menu do app aponta para ela — ver Anti-Patterns |
| `src/lib/empresa-options.ts` | Módulo puro `montarEmpresaOptions` | VERIFIED | Zero imports, filtra nomes coincidentes com fornecedor, dedupe por caixa, descarta vazios |
| `src/app/(app)/relatorios/page.tsx` | Exportação Rápida sem hardcode | VERIFIED | Nenhum array literal de nomes; usa `montarEmpresaOptions` sobre dados reais do banco |
| Leituras remanescentes (`venda-rapida/page.tsx`, `ai-actions.ts`, `db-search.ts`) | Filtram `deletedAt: null` | VERIFIED | Confirmado nas 3 leituras (PDV, `listar_fornecedores`, `fuzzyFindFornecedores`) + reativação em `criar_fornecedor` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `fornecedores-tab-client.tsx` (botão "Excluir selecionados") | `bulkDeleteFornecedores` | `onBulkDeleteAction` prop + `AlertDialogAction onClick={handleBulkDelete}` | WIRED | Confirmação reforçada antes da chamada; server action com RBAC |
| `cadastros/page.tsx` (form "Adicionar Fornecedor") | `addFornecedor` → `classificarNomeFornecedor` | chamada direta na server action | WIRED | Reativação por nome funciona sem tocar o banco diretamente |
| `importacao-fornecedores-client.tsx` | `analisarImportacaoFornecedores` / `confirmarImportacaoFornecedores` | props `analisarAction`/`confirmarAction` passadas de `page.tsx` | WIRED | Dry-run e commit ligados corretamente à UI |
| Menu/sidebar do app | `/importacao/fornecedores` | — | **NOT_WIRED** | Nenhum `<Link>` ou `href` para `/importacao/fornecedores` em `sidebar-nav.tsx`, `layout.tsx` (menu) ou `/importacao/page.tsx`/`/cadastros` — rota só é alcançável digitando a URL |
| `relatorios/page.tsx` (`empresaOptions`) | `montarEmpresaOptions` | import direto + chamada com dados do Prisma | WIRED | Dados reais do banco, não estáticos |
| Botões "PDF {empresa}" | `/api/relatorios/vendas/pdf` | `href` com query string `?empresa=` | WIRED | Rota usa o parâmetro para filtrar a query real |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `relatorios/page.tsx` → `ReportButtonsClient` | `empresaOptions` | `prisma.empresaParceira.findMany()` + `prisma.fornecedor.findMany({ deletedAt: null })` → `montarEmpresaOptions` | Sim — 6 linhas reais confirmadas em produção (`empresas_parceiras`) | FLOWING |
| `/api/relatorios/vendas/pdf` | filtro `empresa` | `searchParams.get("empresa")` → `where: { empresa: { equals, mode: insensitive } }` | Sim — query real, não estática | FLOWING |
| `importacao/fornecedores` dry-run | plano de importação | `prisma.fornecedor.findMany()` (inclui soft-deletados) + `parseCsvFornecedores`/`planejarImportacaoFornecedores` sobre o texto enviado | Sim — leitura real, sem escrita | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `bulkDeleteFornecedores` usa `updateMany`, não `deleteMany` | leitura de código (linha 245) | `updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt: new Date() } })` | PASS |
| `requireAdminOrThrow` lança erro para sessão não-admin | leitura de código (`guards.ts:11-16`) | `throw new Error("Acesso negado. Requer perfil admin.")` quando `role !== "admin"` | PASS |
| CI (vitest + build) verde no commit de merge do PR #36 | `gh pr view 36 --json statusCheckRollup` | `conclusion: SUCCESS`, `workflowName: CI` | PASS |
| `analisarImportacaoFornecedores` não escreve no dry-run | leitura de código (`actions.ts:20-36`) | única chamada Prisma é `fornecedor.findMany` (leitura) | PASS |

Nota: `npx vitest run` não roda nesta máquina (sem `node_modules`), conforme `CLAUDE.md`. CI está verde no commit de merge — evidência aceita conforme instrução da tarefa; suites individuais não foram re-executadas por este verificador.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DAT-01 | 06-02 | Importador CSV com dry-run e commit idempotente | SATISFIED | Código + testes + CI verde; ressalva de navegação (ver Anti-Patterns) |
| DAT-02 | 06-01, 06-03 | Exclusão não-destrutiva (soft-delete + RBAC) e restauração sem acesso ao banco | SATISFIED | Migration aplicada em produção, código + testes + CI verde |
| DAT-03 | 06-03 | Exportação Rápida sem hardcode, botão por empresa parceira real | SATISFIED | Código sem lista fixa; dados reais confirmados (6 empresas) |

**Nota de documentação:** `.planning/REQUIREMENTS.md` ainda lista `DAT-03` como `[ ]` (não marcado) e "Pending" na tabela de rastreamento (linhas 62 e 192), apesar de o código e os dados de produção confirmarem que está completo. Isso é uma inconsistência de documentação, não uma lacuna de código — recomenda-se atualizar o `REQUIREMENTS.md` para refletir o estado real.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(app)/importacao/fornecedores/page.tsx` (e ausência em `sidebar-nav.tsx`/`layout.tsx`) | — | Rota funcional sem nenhum link de navegação no app | ⚠️ Warning | Um admin não descobre a tela de importação de fornecedores navegando pela UI; só funciona se souber a URL exata. Não bloqueia a SC literal de DAT-01 (existência + comportamento), mas compromete a usabilidade real da "capacidade entregue". Recomenda-se adicionar um link em `/importacao` ou na aba Fornecedores de `/cadastros`. |
| `src/components/fornecedores-tab-client.tsx` | 193 | Texto do `AlertDialogDescription`: "Esta ação não pode ser desfeita" | ℹ️ Info | Copy desatualizada — a exclusão agora é soft-delete e É reversível (recadastrando o mesmo nome). Não é um bug funcional, mas pode assustar o admin desnecessariamente ou dar falsa impressão de irreversibilidade. |
| `.planning/REQUIREMENTS.md` | 62, 192 | `DAT-03` marcado como `[ ]`/"Pending" | ℹ️ Info | Documentação desatualizada, não afeta o código |

Nenhum marcador de dívida (`TBD`/`FIXME`/`XXX`) sem referência a issue foi encontrado nos arquivos desta fase.

### Human Verification Required

Ver bloco `human_verification` no frontmatter — 5 itens, todos herdados do checkpoint `gate="blocking"` da Task 3 do plano `06-03-PLAN.md` (que o próprio plano marca como "NÃO aprovar automaticamente"), agora acionáveis porque o rollout da imagem já aconteceu em produção (confirmado: coluna `deleted_at` existe, migration com `finished_at` não-nulo).

### Gaps Summary

Nenhum gap bloqueante encontrado. As três Success Criteria mapeadas em requisitos (DAT-01, DAT-02, DAT-03) têm evidência de código, teste unitário e CI verde, e os dados reais de produção (schema migrado, 6 empresas parceiras) confirmam a premissa. O que resta é:

1. **Checkpoint humano explícito do próprio plano** (Task 3 de `06-03-PLAN.md`) — a verificação visual/funcional em produção nunca foi marcada como executada por um humano; o rollout que a desbloqueava já aconteceu, então os 5 passos do checklist (ver `human_verification`) estão prontos para serem rodados agora.
2. **Achado de usabilidade (não-bloqueante):** `/importacao/fornecedores` não tem link de navegação em lugar nenhum do app — funciona, mas só é alcançável digitando a URL. Vale uma correção rápida (adicionar link em `/importacao` ou na aba Fornecedores), mas não invalida a entrega de DAT-01 como escrita na Success Criteria.
3. **Cosmético:** copy do diálogo de confirmação de exclusão ainda diz "não pode ser desfeita", o que não é mais verdade após o soft-delete.
4. **Documentação:** `REQUIREMENTS.md` não reflete `DAT-03` como completo — atualização de rastreamento, sem impacto em código.

---

*Verified: 2026-08-03T20:19:17Z*
*Verifier: Claude (gsd-verifier)*
