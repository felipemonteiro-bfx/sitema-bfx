# Phase 6: Integridade de dados: fornecedores e exportação - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — decisões tomadas com os defaults sensatos acordados

<domain>
## Phase Boundary

O cadastro de fornecedores volta a ser populável e deixa de ser destrutível sem rede de proteção,
e a exportação rápida reflete as empresas parceiras reais do banco.

**Premissa corrigida por evidência (2026-08-03, consulta somente-leitura ao banco de produção):**
a hipótese original — reconstruir os fornecedores a partir de `audit_logs` — está **descartada**.

- `SELECT count(*) FROM fornecedores` → **0**
- `SELECT count(*) FROM audit_logs WHERE acao = 'fornecedor:delete'` → **0**; nenhuma ação de
  fornecedor jamais foi registrada (`GROUP BY acao` devolve só venda/produto/cliente/despesa/
  LOGIN/EXCLUSAO)
- `SELECT count(*), count(fornecedor_id) FROM produtos` → **197 produtos, 0 com fornecedor_id**
- Audit log começa em 2026-01-31; só existe o banco `bfx`; sem backup no pod; sem seed nem CSV

Os fornecedores **nunca existiram neste banco** — ficaram no sistema legado (tag
`legacy-streamlit-final`). Não há fonte recuperável. DAT-01 passa a ser "entregar o importador".

</domain>

<decisions>
## Implementation Decisions

- **D-01 — DAT-01 é um importador CSV, não um restore.** Server action com duas etapas:
  `dry-run` (analisa e devolve contagens de criados/ignorados/erros, sem escrever nada) e
  `commit` (aplica). Idempotente por nome normalizado — rodar duas vezes com o mesmo arquivo não
  duplica. Colunas mínimas: `nome` (obrigatório), `telefone` (opcional). A carga real depende de
  um arquivo que o cliente ainda deve; a fase entrega a capacidade, não os dados.

- **D-02 — Soft-delete no model `Fornecedor`.** Adicionar `deletedAt DateTime?`. O bulk delete
  passa a marcar `deletedAt` em vez de `deleteMany`. Todas as leituras existentes passam a
  filtrar `deletedAt: null`.

- **D-03 — O unique de `nome` precisa conviver com o soft-delete.** Hoje `nome` é `@unique`
  global. Com soft-delete, um fornecedor excluído passaria a bloquear a recriação do mesmo nome
  com um erro incompreensível. Solução: ao criar/importar um nome que já existe **soft-deletado**,
  **reativar** o registro (limpar `deletedAt`) em vez de inserir outro. Isso preserva o
  `fornecedor_id` histórico dos produtos e evita mexer no índice unique.

- **D-04 — `requireAdminOrThrow()` no bulk delete.** Achado desta investigação:
  `bulkDeleteFornecedores` (`src/app/(app)/cadastros/page.tsx:205`) **não tem nenhuma guarda de
  papel** — qualquer usuário autenticado pode apagar o cadastro inteiro. A guarda já existe em
  `src/lib/guards.ts` e é usada em outros pontos; aqui foi esquecida.

- **D-05 — Restaurar sem acesso ao banco.** Com `deletedAt`, um fornecedor excluído por engano é
  restaurável pela própria aplicação. Escopo mínimo: a reativação por nome de D-03 já satisfaz o
  critério 3 da fase. Uma tela de "lixeira" fica fora de escopo.

- **D-06 — DAT-03 remove o hardcode preservando a regra existente.** `relatorios/page.tsx:24` tem
  `const extraEmpresas = ["AMAZON FIVE", "Gimam"]`. Trocar por consulta ao banco. **Manter** o
  filtro das linhas 26-28, que exclui de `empresaOptions` os nomes que coincidem com fornecedores
  — sem isso o cliente passa a ver botões estranhos na tela.

### Migration — restrição de execução

O executor **não** roda `prisma migrate dev` nem `prisma db push` (ambos escrevem no banco).
Ele escreve o arquivo SQL em `prisma/migrations/<timestamp>_<nome>/migration.sql` à mão e
atualiza `prisma/schema.prisma`. A aplicação da migration é ação humana/deploy.

</decisions>

<code_context>
## Existing Code Insights

- `prisma/schema.prisma:212` — `model Fornecedor { id, nome @unique, telefone, produtos }`.
  **Nenhum model do projeto tem soft-delete hoje** (`deletedAt` não aparece no schema) — este será
  o primeiro, então não há padrão interno a seguir.
- `src/app/(app)/cadastros/page.tsx:205` — `bulkDeleteFornecedores`, sem guarda de papel; grava
  `createAuditLog("fornecedor:delete", ...)` depois de apagar.
- Leituras de fornecedor que precisam do filtro `deletedAt: null`:
  `src/app/(app)/cadastros/page.tsx:398`, `src/app/(app)/venda-rapida/page.tsx:22`,
  `src/app/(app)/relatorios/page.tsx:21`, `src/lib/ai-actions.ts:1177`, `src/lib/db-search.ts:53`.
- `src/lib/guards.ts` — `requireAdmin()` e `requireAdminOrThrow()` prontos.
- `src/app/(app)/importacao/page.tsx` — já existe uma página de importação com modelo CSV
  (`csvModel`, download de `modelo-importacao.csv`); é o lugar natural e o padrão a imitar.
- `normalizeUppercase()` é usado nos cadastros — o nome do fornecedor é gravado em caixa alta,
  o que ajuda na idempotência por nome.
- `src/lib/venda-item-validation.ts` + seu teste são o padrão de referência para lógica de
  negócio pura e testável (o parser/dedupe do CSV deve seguir esse formato).

</code_context>

<specifics>
## Specific Ideas

- O parser do CSV e a lógica de dry-run devem morar num módulo **puro, sem imports**
  (ex.: `src/lib/fornecedor-import.ts`), pelo mesmo motivo da Fase 5: é a única forma de
  verificar comportamento localmente via `node --input-type=module`, já que o vitest não roda
  nesta máquina.
- Testes obrigatórios: rodar o mesmo CSV duas vezes não duplica; nome já existente e
  soft-deletado reativa em vez de falhar no unique; linha sem nome vira erro reportado, não
  exceção; dry-run não escreve nada.
- DAT-03 pede um teste sobre a construção de `empresaOptions` a partir de uma lista mock, sem
  hardcode e preservando o filtro de fornecedores.

</specifics>

<deferred>
## Deferred Ideas

- Tela de lixeira/restauração de fornecedores — a reativação por nome já cobre o critério.
- Soft-delete nos demais cadastros (clientes, produtos, empresas) — fora de escopo, registrado
  no REQUIREMENTS.md.
- Religar os 197 produtos órfãos a fornecedores — não há dado de origem para isso.

</deferred>
