# Relatório mensal configurável por empresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar o dia de envio mensal por empresa e enviar ao RH duas planilhas preenchidas com uma linha para cada funcionário/produto do mês corrente até o dia do envio.

**Architecture:** Adicionar a configuração `diaRelatorioMensal` em `EmpresaParceira`, executar o cron mensal diariamente e filtrar empresas pelo dia atual em Manaus. Isolar a consolidação em função pura e gerar dois anexos a partir das linhas consolidadas: o modelo XML de antecipação e o layout oficial da empresa, ambos enviados pelo serviço mensal existente.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 6/PostgreSQL, Vitest, Kubernetes CronJob, SMTP existente e geradores `.xls` SpreadsheetML/XML.

**Spec:** `docs/superpowers/specs/2026-09-22-relatorio-mensal-configuravel-design.md`

## Global Constraints

- O período automático é o mês corrente, do primeiro dia até o dia local de Manaus no momento do envio.
- O destinatário é somente `EmpresaParceira.emailRh`; não usar `emailsExtras`, cópia administrativa ou WhatsApp neste fluxo.
- Cada linha consolidada representa um funcionário + produto; vários produtos do mesmo funcionário permanecem em linhas separadas.
- O valor da linha é a soma dos descontos/parcelas aplicáveis daquele produto no período.
- Empresas sem `diaRelatorioMensal` usam o dia 1 para manter o comportamento existente.
- Alterações locais não relacionadas em `src/app/(app)/venda-rapida/actions.ts`, `src/lib/parcelas.ts` e `task-4-report.md` devem permanecer fora dos commits.

---

### Task 1: Adicionar configuração de dia por empresa

**Files:**
- Modify: `prisma/schema.prisma` no modelo `EmpresaParceira`
- Create: `prisma/migrations/20260922150000_add_dia_relatorio_mensal/migration.sql`
- Modify: `src/app/(app)/cadastros/page.tsx` nas actions de criar/editar empresa
- Modify: `src/components/empresas-tab-client.tsx` no formulário de edição/criação e tipo da empresa
- Test: `src/__tests__/empresa-relatorio-config.test.ts`

**Interfaces:**
- Produces Prisma field `EmpresaParceira.diaRelatorioMensal: number | null` mapped to `dia_relatorio_mensal`.
- The UI submits `diaRelatorioMensal` as an integer in the inclusive range 1–31, or null to use default day 1.

- [x] **Step 1: Write the failing validation test**

Test the pure validation helper used by the server action:

```ts
expect(validarDiaRelatorioMensal("21")).toBe(21);
expect(validarDiaRelatorioMensal(0)).toBeNull();
expect(() => validarDiaRelatorioMensal("32")).toThrow("dia do relatório");
```

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run src/__tests__/empresa-relatorio-config.test.ts`

Expected: FAIL because the validator and field do not exist.

- [x] **Step 3: Add the schema and migration**

Add:

```prisma
diaRelatorioMensal Int? @map("dia_relatorio_mensal")
```

Create SQL that adds the nullable integer column and a check constraint `dia_relatorio_mensal IS NULL OR dia_relatorio_mensal BETWEEN 1 AND 31`.

- [x] **Step 4: Implement validation and wire the cadastro form**

Create a small helper in `src/lib/relatorio-mensal-config.ts`:

```ts
export function validarDiaRelatorioMensal(value: unknown): number | null;
export function diaEfetivoRelatorioMensal(value: number | null | undefined): number;
```

Use `diaEfetivoRelatorioMensal` when saving null/default values. Add an optional numeric field labeled `Dia do relatório mensal` to the company form and include it in the selected/listed company data.

- [x] **Step 5: Run tests and lint**

Run: `npx vitest run src/__tests__/empresa-relatorio-config.test.ts src/__tests__/empresa-options.test.ts && npx eslint src/lib/relatorio-mensal-config.ts src/app/'(app)'/cadastros/page.tsx src/components/empresas-tab-client.tsx`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260922150000_add_dia_relatorio_mensal/migration.sql src/lib/relatorio-mensal-config.ts src/app/'(app)'/cadastros/page.tsx src/components/empresas-tab-client.tsx src/__tests__/empresa-relatorio-config.test.ts
git commit -m "feat: configurar dia do relatorio mensal por empresa"
```

### Task 2: Criar consolidação pura por funcionário e produto

**Files:**
- Create: `src/lib/relatorio-mensal-produtos.ts`
- Test: `src/__tests__/relatorio-mensal-produtos.test.ts`

**Interfaces:**
- Consumes `VendaRelatorioMensal[]` with client identity, item product names/subtotals, `parcelasVencimento`, `descontoEmFolha`, `formaPagamento`, and date bounds.
- Produces `LinhaProdutoRelatorio`:

```ts
type LinhaProdutoRelatorio = {
  clienteId: number;
  nome: string;
  cpf: string;
  matricula: string;
  empresa: string;
  dataCompra: string;
  produto: string;
  valorAcumulado: number;
  parcela: string;
  dataDesconto: string;
};

function consolidarProdutosRelatorio(
  vendas: VendaRelatorioMensal[],
  inicio: Date,
  fim: Date,
): { linhas: LinhaProdutoRelatorio[]; totalFuncionarios: number; totalProdutos: number; totalDesconto: number };
```

- [x] **Step 1: Write failing tests for multiple products**

Cover one client with two products, repeated sales/installments of the same product, separate clients, date exclusion, and the empty result. Assert that repeated products aggregate only within the same client/product key and different products remain separate rows.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run src/__tests__/relatorio-mensal-produtos.test.ts`

Expected: FAIL because the module is absent.

- [x] **Step 3: Implement normalization and aggregation**

Use client CPF when available, otherwise client id, plus normalized product name as the grouping key. For itemized sales, use each item as its own product line; for legacy sales without items, use the legacy product name or `—`. Sum the applicable installment/desconto values and keep deterministic sorting by employee name then product.

- [x] **Step 4: Run the focused test**

Run: `npx vitest run src/__tests__/relatorio-mensal-produtos.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/relatorio-mensal-produtos.ts src/__tests__/relatorio-mensal-produtos.test.ts
git commit -m "feat: consolidar descontos por funcionario e produto"
```

### Task 3: Gerar os dois anexos mensais preenchidos

**Files:**
- Modify: `src/lib/relatorio-mensal-xlsx.ts` to generate the first model from `LinhaProdutoRelatorio[]`
- Create: `src/lib/relatorio-mensal-oficial-xls.ts` for the official company layout
- Create: `src/assets/modelos/antecipacao-modelo.xls` by copying the approved XML template content
- Create: `src/assets/modelos/amazon-five-modelo.xls` as the normalized generated SpreadsheetML equivalent of the supplied official model
- Test: `src/__tests__/relatorio-mensal-planilhas.test.ts`

**Interfaces:**
- Produces `gerarPlanilhaAntecipacao(linhas, competencia): Buffer`.
- Produces `gerarPlanilhaModeloOficial(linhas, competencia): Buffer`.
- Both outputs are `.xls` SpreadsheetML/XML buffers readable by Excel and contain no unrelated company rows.

- [x] **Step 1: Write failing generator tests**

Assert the first buffer contains the current month worksheet and columns from the supplied anticipation model; assert the second buffer contains the official columns `Nome`, `CPF`, `Empresa`, `Data da Compra`, `Produto`, `Valor da Parcela`, `Parcela`, and `Data de Desconto`. Assert XML escaping for names/products and one row per consolidated product line.

- [x] **Step 2: Run tests and verify failure**

Run: `npx vitest run src/__tests__/relatorio-mensal-planilhas.test.ts`

Expected: FAIL because the new generators are absent.

- [x] **Step 3: Implement the first generator**

Reuse `escapeXml`, numeric cells, and SpreadsheetML styles from `src/lib/relatorio-mensal-xlsx.ts`, but make the row source `LinhaProdutoRelatorio[]` and emit the product/desconto columns required by the approved model. Keep the file extension `.xls` and MIME `application/vnd.ms-excel`.

- [x] **Step 4: Implement the official generator**

Generate a workbook with the supplied official column order and formatting-compatible XML. Use the same data rows, repeated per product, and format the installment and discount-date fields exactly as strings expected by the model. Do not copy sample employees or sample values from the supplied file.

- [x] **Step 5: Run generator tests**

Run: `npx vitest run src/__tests__/relatorio-mensal-planilhas.test.ts`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/lib/relatorio-mensal-xlsx.ts src/lib/relatorio-mensal-oficial-xls.ts src/assets/modelos/ src/__tests__/relatorio-mensal-planilhas.test.ts
git commit -m "feat: gerar duas planilhas mensais por produto"
```

### Task 4: Adapt the monthly service and email to the new attachments

**Files:**
- Modify: `src/lib/relatorio-mensal-service.ts`
- Modify: `src/lib/relatorio-mensal.ts` types/helpers as needed for CPF and company data
- Test: `src/__tests__/relatorio-mensal-service.test.ts`

**Interfaces:**
- `processarRelatorioMensal({ periodo, empresaId?, force?, inicio?, fim? })` supports a current-month partial period while retaining manual `YYYY-MM` compatibility.
- Successful email contains two attachments with stable names: `antecipacao-<empresa>-<periodo>.xls` and `relatorio-oficial-<empresa>-<periodo>.xls`.

- [x] **Step 1: Write failing service tests**

Mock Prisma, SMTP and both generators. Assert that a configured current-month period queries `dataVenda` from day 1 through the requested end day, consolidates rows, sends exactly two attachments to `emailRh`, and records the result. Assert missing email, no sales, and send failure statuses.

- [x] **Step 2: Run tests and verify failure**

Run: `npx vitest run src/__tests__/relatorio-mensal-service.test.ts`

Expected: FAIL because the service still generates the old PDF/XLS pair and uses group e-mails/fallback behavior.

- [x] **Step 3: Implement current-period boundaries**

Add a helper that receives a Manaus-local reference date and returns UTC start-of-month and end-of-day boundaries. Keep manual previous-month generation available for existing UI actions, while automatic processing passes the current partial period explicitly.

- [x] **Step 4: Implement single-RH recipient and two attachments**

Use the canonical company `emailRh` only, call the pure product consolidator, generate both buffers, send both attachments, and write the existing `RelatorioEnvioLog` with totals. Preserve `force: true` for manual resend.

- [x] **Step 5: Run tests and lint**

Run: `npx vitest run src/__tests__/relatorio-mensal-service.test.ts src/__tests__/relatorio-mensal.test.ts src/__tests__/email-mime.test.ts && npx eslint src/lib/relatorio-mensal-service.ts src/lib/relatorio-mensal.ts`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/lib/relatorio-mensal-service.ts src/lib/relatorio-mensal.ts src/__tests__/relatorio-mensal-service.test.ts
git commit -m "feat: enviar consolidado mensal ao RH"
```

### Task 5: Make the cron daily and select companies by configured day

**Files:**
- Modify: `src/app/api/cron/relatorio-mensal/route.ts`
- Modify: `deploy/bfx/cronjobs-app.yaml`
- Test: `src/__tests__/relatorio-mensal-route.test.ts`

**Interfaces:**
- `GET /api/cron/relatorio-mensal` authenticates as before, computes the current Manaus date, selects only companies whose effective configured day equals today, and invokes the service with the current-month partial period.

- [x] **Step 1: Write failing route tests**

Mock the clock to day 21 and Prisma companies with configured days 21, 22, and null. Assert only day 21 and default-day-1 behavior are selected, and assert the service receives current-month boundaries. Assert an empty selection returns `empresas: 0` without sending.

- [x] **Step 2: Run tests and verify failure**

Run: `npx vitest run src/__tests__/relatorio-mensal-route.test.ts`

Expected: FAIL because the route currently sends all companies on the first day and defaults to the previous month.

- [x] **Step 3: Implement daily selection**

Query `diaRelatorioMensal` with company data, compute the effective day using the shared helper, filter by the Manaus calendar day, and call `processarRelatorioMensal` per selected company/group with the current-period options.

- [x] **Step 4: Update the Kubernetes schedule**

Change `bfx-relatorio-mensal` from `0 12 1 * *` to a daily schedule at the existing report hour, and update the comment to state that company-level filtering determines recipients.

- [x] **Step 5: Run route tests and lint**

Run: `npx vitest run src/__tests__/relatorio-mensal-route.test.ts src/__tests__/cron-auth.test.ts && npx eslint src/app/api/cron/relatorio-mensal/route.ts`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/app/api/cron/relatorio-mensal/route.ts deploy/bfx/cronjobs-app.yaml src/__tests__/relatorio-mensal-route.test.ts
git commit -m "feat: agendar relatorio mensal por dia da empresa"
```

### Task 6: Verify manual resend and UI visibility

**Files:**
- Modify: `src/app/(app)/relatorios/mensais/page.tsx` if the configured period/attachments need display changes
- Modify: `src/app/(app)/relatorios/mensais/actions.ts` only if current-period resend needs explicit end date
- Test: `src/__tests__/relatorio-mensal-reenvio.test.ts`

**Interfaces:**
- Manual resend remains restricted by `requireAdminOrThrow`, passes `force: true`, and can resend a selected company/period without changing its configured automatic day.

- [x] **Step 1: Write failing resend regression test**

Mock the action dependencies and assert `reenviarRelatorioMensal` calls `processarRelatorioMensal({ empresaId, periodo, force: true })`, then revalidates `/relatorios/mensais`.

- [x] **Step 2: Run the test**

Run: `npx vitest run src/__tests__/relatorio-mensal-reenvio.test.ts`

Expected: PASS if the existing action still matches; if current-period parameters are required, the test exposes the exact adapter change.

- [x] **Step 3: Update the monthly report page**

Show the configured day in the company/report context and keep the existing manual resend control. Ensure attachment names/types in the download UI remain accurate for the two generated `.xls` files.

- [x] **Step 4: Run UI/action tests and lint**

Run: `npx vitest run src/__tests__/relatorio-mensal-reenvio.test.ts src/__tests__/relatorios-seguranca.test.ts && npx eslint src/app/'(app)'/relatorios/mensais/page.tsx src/app/'(app)'/relatorios/mensais/actions.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/'(app)'/relatorios/mensais/page.tsx src/app/'(app)'/relatorios/mensais/actions.ts src/__tests__/relatorio-mensal-reenvio.test.ts
git commit -m "feat: manter reenvio manual do relatorio mensal"
```

### Task 7: Full feature verification

**Files:**
- Test: all feature tests from Tasks 1–6

- [x] **Step 1: Run the focused feature suite**

Run:

```bash
npx vitest run \
  src/__tests__/empresa-relatorio-config.test.ts \
  src/__tests__/relatorio-mensal-produtos.test.ts \
  src/__tests__/relatorio-mensal-planilhas.test.ts \
  src/__tests__/relatorio-mensal-service.test.ts \
  src/__tests__/relatorio-mensal-route.test.ts \
  src/__tests__/relatorio-mensal-reenvio.test.ts \
  src/__tests__/relatorio-mensal.test.ts \
  src/__tests__/email-mime.test.ts
```

Expected: all feature tests pass.

- [x] **Step 2: Run diff and lint checks**

Run: `git diff --check && npx eslint src/lib/relatorio-mensal-config.ts src/lib/relatorio-mensal-produtos.ts src/lib/relatorio-mensal-xlsx.ts src/lib/relatorio-mensal-oficial-xls.ts src/lib/relatorio-mensal-service.ts src/app/api/cron/relatorio-mensal/route.ts`

Expected: no whitespace or lint errors.

- [x] **Step 3: Review migration and working tree**

Run: `git status --short && git diff --stat HEAD~6..HEAD`

Confirm that only feature commits contain the implementation and the pre-existing unrelated working-tree changes remain untouched.

- [x] **Step 4: Commit any final test-only adjustment**

If the verification finds an implementation defect, add a focused regression test and fix it before the final handoff. Do not stage `src/app/(app)/venda-rapida/actions.ts`, `src/lib/parcelas.ts`, or `task-4-report.md`.
