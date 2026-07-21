---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/relatorios/vendas-xlsx/route.ts
  - src/app/(app)/historico/page.tsx
autonomous: true
requirements: [VENDAS-XLSX-EXPORT]

must_haves:
  truths:
    - "User can download an .xls file with all sales from the filtered period"
    - "The spreadsheet contains: cliente, data, valor total, status, forma de pagamento, produtos"
    - "A download button is visible in the historico page near the table header"
  artifacts:
    - path: "src/app/api/relatorios/vendas-xlsx/route.ts"
      provides: "GET endpoint that queries vendas and returns XML Spreadsheet"
      exports: ["GET"]
    - path: "src/app/(app)/historico/page.tsx"
      provides: "Download button linking to the xlsx export endpoint"
  key_links:
    - from: "src/app/(app)/historico/page.tsx"
      to: "/api/relatorios/vendas-xlsx"
      via: "anchor href with current filter params (from, to, vendedor, cliente, produto, formaPagamento)"
      pattern: "api/relatorios/vendas-xlsx"
---

<objective>
Create an Excel (.xls) export endpoint for vendas (sales) and add a download button to the historico page.

Purpose: User needs to generate a spreadsheet of sales for a given period (e.g., March 2026) with client name, date, total value, status, payment method, and products.
Output: New API route + download button in historico page.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/relatorios/antecipacao-xlsx/route.ts (existing pattern for XML Spreadsheet generation — follow same escapeXml/buildXmlSheet approach)
@src/app/(app)/historico/page.tsx (page where download button will be added)
@src/lib/venda-utils.ts (valorTotalVenda, produtosTexto utility functions)
@src/lib/forma-pagamento.ts (formaPagamentoLabel for human-readable payment method)
@prisma/schema.prisma (Venda model with fields: dataVenda, status, formaPagamento, cliente relation, itens relation)

<interfaces>
From src/lib/venda-utils.ts:
```typescript
export function valorTotalVenda(v: { itens?: { subtotal: number }[]; valorVenda?: number | null; quantidade?: number | null; valorFrete?: number | null; desconto?: number | null; }): number;
export function produtosTexto(v: { itens?: { produtoNome: string; quantidade: number }[]; produtoNome?: string | null; quantidade?: number | null; }): string;
```

From src/lib/forma-pagamento.ts:
```typescript
export function formaPagamentoLabel(forma: FormaPagamento | null | undefined): string;
export function formaFromLegacyFlags(flags: { descontoEmFolha?: boolean; boleto?: boolean }): FormaPagamento;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create vendas-xlsx API route</name>
  <files>src/app/api/relatorios/vendas-xlsx/route.ts</files>
  <action>
Create a GET endpoint at `src/app/api/relatorios/vendas-xlsx/route.ts` that:

1. Accepts query params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `vendedor`, `cliente` (id), `produto`, `formaPagamento` — all optional. Defaults: from = first day of current month, to = today.

2. Queries `prisma.venda.findMany` with the same filter logic used in the historico page:
   - `dataVenda: { gte: start, lte: end }`
   - `vendedor` filter (if not "all")
   - `produto` filter via OR on `produtoNome` and `itens.some.produtoNome` (if not "all")
   - `clienteId` filter (if not "all")
   - `formaPagamento` filter (if not "all")
   - Include: `cliente { nome }`, `itens { produtoNome, quantidade, subtotal }`, plus select fields: `dataVenda, vendedor, produtoNome, quantidade, valorVenda, valorFrete, desconto, descontoEmFolha, boleto, formaPagamento, status, parcelas`

3. Build XML Spreadsheet (same pattern as `antecipacao-xlsx/route.ts`):
   - Use `escapeXml()` helper (copy from antecipacao-xlsx)
   - Single worksheet named "Vendas"
   - Headers: `Cliente | Data | Vendedor | Produtos | Qtd | Valor Total | Parcelas | Forma Pagamento | Status`
   - For each venda row:
     - Cliente: `v.cliente?.nome || "N/D"`
     - Data: format as DD/MM/YYYY using UTC
     - Vendedor: `v.vendedor || ""`
     - Produtos: use `produtosTexto(v)` from venda-utils
     - Qtd: count from itens or legacy quantidade
     - Valor Total: use `valorTotalVenda(v)` — format as Number type in XML
     - Parcelas: `v.parcelas || 1`
     - Forma Pagamento: use `formaPagamentoLabel(formaFromLegacyFlags({ descontoEmFolha: v.descontoEmFolha, boleto: v.boleto }))` if `v.formaPagamento` is null, otherwise `formaPagamentoLabel(v.formaPagamento as FormaPagamento)`
     - Status: `v.status`
   - Add a bold style for headers (ss:StyleID="bold")
   - Add a totals row at the bottom with sum of Valor Total

4. Return Response with:
   - Content-Type: `application/vnd.ms-excel`
   - Content-Disposition: `attachment; filename=vendas-{from}-a-{to}.xls`

5. Wrap in try/catch, return 500 JSON on error.

IMPORTANT: Do NOT use any external xlsx library. Use the XML Spreadsheet 2003 format exactly like antecipacao-xlsx/route.ts does. This avoids npm install issues.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit src/app/api/relatorios/vendas-xlsx/route.ts 2>&1 | head -20 || echo "Check TS manually"</automated>
  </verify>
  <done>GET /api/relatorios/vendas-xlsx returns a valid .xls file with vendas data filtered by query params. File opens in Excel/Google Sheets with correct columns and data.</done>
</task>

<task type="auto">
  <name>Task 2: Add download button to historico page</name>
  <files>src/app/(app)/historico/page.tsx</files>
  <action>
In `src/app/(app)/historico/page.tsx`, add a "Exportar Excel" download button:

1. Import `Download` icon from `lucide-react` (already a project dependency).

2. In the Card header section (around line 328), where the CardTitle "Vendas ({totalVendas})" is rendered, add a download link next to the pagination text. The area currently has:
   ```
   <CardHeader className="flex flex-row items-center justify-between">
     <CardTitle>Vendas ({totalVendas})</CardTitle>
     <div className="text-xs text-muted-foreground">Pagina {page} de {totalPages || 1}</div>
   </CardHeader>
   ```

   Change to add a download link between the title and pagination:
   ```
   <CardHeader className="flex flex-row items-center justify-between">
     <CardTitle>Vendas ({totalVendas})</CardTitle>
     <div className="flex items-center gap-3">
       <a
         href={`/api/relatorios/vendas-xlsx?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}${sp.vendedor && sp.vendedor !== "all" ? `&vendedor=${sp.vendedor}` : ""}${sp.cliente && sp.cliente !== "all" ? `&cliente=${sp.cliente}` : ""}${sp.produto && sp.produto !== "all" ? `&produto=${sp.produto}` : ""}${sp.formaPagamento && sp.formaPagamento !== "all" ? `&formaPagamento=${sp.formaPagamento}` : ""}`}
         className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
         download
       >
         <Download className="h-4 w-4" />
         <span className="hidden sm:inline">Exportar Excel</span>
       </a>
       <div className="text-xs text-muted-foreground">Pg {page}/{totalPages || 1}</div>
     </div>
   </CardHeader>
   ```

   This passes the current active filters to the export endpoint so the user gets exactly the filtered data they see in the table.

3. Build the href more cleanly: create a helper variable `xlsxHref` before the return JSX that constructs the URL with URLSearchParams to avoid the messy template literal. Example:
   ```typescript
   const xlsxParams = new URLSearchParams();
   xlsxParams.set("from", start.toISOString().slice(0, 10));
   xlsxParams.set("to", end.toISOString().slice(0, 10));
   if (sp.vendedor && sp.vendedor !== "all") xlsxParams.set("vendedor", sp.vendedor);
   if (sp.cliente && sp.cliente !== "all") xlsxParams.set("cliente", sp.cliente);
   if (sp.produto && sp.produto !== "all") xlsxParams.set("produto", sp.produto);
   if (sp.formaPagamento && sp.formaPagamento !== "all") xlsxParams.set("formaPagamento", sp.formaPagamento);
   const xlsxHref = `/api/relatorios/vendas-xlsx?${xlsxParams.toString()}`;
   ```
   Place this right before the `return (` statement.

NOTE: The `buttonVariants` import already exists. The `Download` icon just needs to be added to the existing lucide-react import (which already imports `CheckCircle2`).
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && grep -q "vendas-xlsx" src/app/(app)/historico/page.tsx && grep -q "Exportar Excel" src/app/(app)/historico/page.tsx && echo "OK: button added" || echo "FAIL: button missing"</automated>
  </verify>
  <done>Historico page shows an "Exportar Excel" button with download icon next to the vendas table title. Clicking it downloads the .xls file with current filters applied.</done>
</task>

</tasks>

<verification>
1. Visit /historico with a date range covering March 2026 (from=2026-03-01, to=2026-03-31)
2. Confirm the "Exportar Excel" button is visible in the card header
3. Click the button — browser should download a .xls file
4. Open the file in Excel/Sheets — verify columns: Cliente, Data, Vendedor, Produtos, Qtd, Valor Total, Parcelas, Forma Pagamento, Status
5. Verify the data matches the vendas shown in the table for the same period
6. Test with filters (vendedor, cliente, produto, formaPagamento) — exported file should respect filters
</verification>

<success_criteria>
- API route /api/relatorios/vendas-xlsx returns a downloadable .xls file
- Spreadsheet contains correct columns with data from the filtered period
- Download button visible in historico page, passes current filters to API
- No new npm dependencies required (uses XML Spreadsheet 2003 format)
</success_criteria>

<output>
After completion, create `.planning/quick/260413-bug-quero-uma-planilha-das-vendas-do-mes-de-/260413-bug-SUMMARY.md`
</output>
