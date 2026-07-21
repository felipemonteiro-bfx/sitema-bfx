---
phase: quick-260323-dyu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/ai-actions.ts
autonomous: true
requirements: [CRITICAL-01, MEDIUM-04, MEDIUM-05, LOW-05]
must_haves:
  truths:
    - "AI-created sales have correct lucroLiquido stored in DB"
    - "AI consultar_comissoes returns correct totals for multi-product sales"
    - "AI resumo_relatorio_vendas includes taxaNota in cost calculation"
    - "AI resumo_margem_produto filters by date when from/to params provided"
  artifacts:
    - path: "src/lib/ai-actions.ts"
      provides: "Fixed AI financial calculations"
      contains: "lucroLiquido"
  key_links:
    - from: "src/lib/ai-actions.ts (criar_venda)"
      to: "prisma.venda.create"
      via: "lucroLiquido field in data object"
      pattern: "lucroLiquido:"
---

<objective>
Fix clear financial calculation bugs in AI actions: missing lucroLiquido on AI-created sales,
fragile consultar_comissoes query, missing taxaNota in resumo cost calculation, and missing
date filter in resumo_margem_produto.

Purpose: AI-created sales currently store null lucroLiquido, causing 0 commission and 0 profit
in dashboards. Several AI report actions also produce incorrect numbers.

Output: Corrected ai-actions.ts with all four bugs fixed.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/ai-actions.ts
@src/lib/venda-utils.ts
@src/app/(app)/venda-rapida/actions.ts (reference for correct lucro formula)

<interfaces>
From src/lib/venda-utils.ts:
```typescript
export function valorTotalVenda(v: {
  itens?: { subtotal: number }[];
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
}): number;
```

Prisma Venda model relevant fields:
- temNota: Boolean (default false)
- taxaNota: Float? (default 5.97)
- lucroLiquido: Float?
- custoProduto: Float
- custoEnvio: Float
- valorVenda: Float
- valorFrete: Float
- parcelas: Int
- valorParcela: Float
</interfaces>

<out_of_scope>
These issues from the research are OUT OF SCOPE for this quick task:
- CRITICAL-02 (AI criar_venda no ItemVenda): Requires designing multi-product AI creation flow — product decision needed
- CRITICAL-03 (comissao base inconsistency): Requires product decision — revenue vs profit
- CRITICAL-04 (cash flow ignores ParcelaVencimento): Large architectural refactor
- CRITICAL-05 (import batch missing taxaNota): Import schema has no temNota/taxaNota fields — design gap, not a simple bug
- MEDIUM-01 (dashboard top products): Related to CRITICAL-02
- MEDIUM-03 (stored vs computed lucroLiquido divergence): Design decision needed
- MEDIUM-06 (performance - loads all records): Optimization, not a bug
- MEDIUM-08 (no status field on Venda): Requires schema migration
- MEDIUM-09 (DRE circular dependency): Same as CRITICAL-03 — product decision
</out_of_scope>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix AI criar_venda to compute and store lucroLiquido</name>
  <files>src/lib/ai-actions.ts</files>
  <action>
In the `criar_venda` case (around line 819-837), add lucroLiquido computation before the prisma.venda.create call.

The formula matches the V1 criarVenda in venda-rapida/actions.ts (line 37):
```
lucro = total - (custoProduto + custoEnvio)
```

Where `total = valorVenda + valorFrete` (single-product AI sale, no quantity multiplier since AI sends flat values).

Specifically:
1. Before the `result = await prisma.venda.create({` line, compute:
   ```
   const valorVenda = parsedParams.valorVenda || 0;
   const valorFrete = parsedParams.valorFrete || 0;
   const custoProduto = parsedParams.custoProduto || 0;
   const custoEnvio = parsedParams.custoEnvio || 0;
   const total = valorVenda + valorFrete;
   const lucroLiquido = total - (custoProduto + custoEnvio);
   ```
2. Add `lucroLiquido,` to the data object in the create call.
3. Use the local variables (`valorVenda`, `valorFrete`, etc.) in the data object instead of repeating `parsedParams.X || 0`.

Note: AI criar_venda does not support temNota/taxaNota params, so no nota fiscal deduction. This is consistent — the AI action is a simplified single-product creation path.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && grep -A 20 'case "criar_venda"' src/lib/ai-actions.ts | grep -q "lucroLiquido"</automated>
  </verify>
  <done>AI criar_venda stores computed lucroLiquido. The formula matches V1 criarVenda logic (minus taxaNota which is not applicable here).</done>
</task>

<task type="auto">
  <name>Task 2: Fix AI report action calculation bugs</name>
  <files>src/lib/ai-actions.ts</files>
  <action>
Fix three separate bugs in AI report actions:

**Bug A — consultar_comissoes missing itens/quantidade in select (MEDIUM-04, ~line 1282):**
The select is `{ vendedor: true, valorVenda: true, valorFrete: true }` but `valorTotalVenda()` needs `itens[].subtotal` and `quantidade`. Change the query from `select` to `include` or add the missing fields:
```
select: {
  vendedor: true,
  valorVenda: true,
  valorFrete: true,
  quantidade: true,
  itens: { select: { subtotal: true } },
}
```
This ensures `valorTotalVenda()` correctly computes totals for both V1 (uses valorVenda * quantidade) and V2 (uses itens.subtotal) sales.

**Bug B — resumo_relatorio_vendas missing taxaNota in cost (MEDIUM-05, ~line 1123-1129):**
The `totalCusto` reduce does not include nota fiscal tax. After `custoItens + custoEnvio`, also add the taxaNota cost. The vendas query already uses `include` (not select), so `temNota` and `taxaNota` are available on each venda object.

Change the totalCusto reduce to also include:
```
const notaCost = v.temNota ? ((valorTotalVenda(v) - (v.valorFrete ?? 0)) * (v.taxaNota ?? 5.97) / 100) : 0;
```
Add `notaCost` to the return sum. The formula is: taxaNota% applied to subtotal (total minus frete), matching how criarVenda and criarVendaV2 compute valorDescontoNota.

**Bug C — resumo_margem_produto ignores date filter (LOW-05, ~line 1154-1164):**
1. Add `from` and `to` optional string params to the `resumo_margem_produto` schema (around line 193):
   ```
   resumo_margem_produto: z.object({
     from: optionalString(),
     to: optionalString(),
     limit: optionalNumber(),
   }),
   ```
2. In the handler (~line 1157), add date filtering to the ItemVenda query by joining through the venda relation, matching the pattern used in `relatorios/margem-produto/route.ts`:
   ```
   const fromDate = parsedParams?.from ? new Date(parsedParams.from) : undefined;
   const toDate = parsedParams?.to ? new Date(parsedParams.to) : undefined;
   const itens = await prisma.itemVenda.findMany({
     where: (fromDate || toDate) ? {
       venda: {
         dataVenda: {
           ...(fromDate ? { gte: fromDate } : {}),
           ...(toDate ? { lte: toDate } : {}),
         },
       },
     } : undefined,
     select: {
       produtoNome: true,
       subtotal: true,
       custoProduto: true,
       quantidade: true,
     },
   });
   ```
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && grep -A 5 'case "consultar_comissoes"' src/lib/ai-actions.ts | grep -q "itens" && grep -B2 -A2 'totalCusto' src/lib/ai-actions.ts | grep -q "temNota\|taxaNota\|notaCost" && grep -A 3 'resumo_margem_produto.*z.object' src/lib/ai-actions.ts | grep -q "from"</automated>
  </verify>
  <done>
- consultar_comissoes selects itens and quantidade so valorTotalVenda works for V2 sales
- resumo_relatorio_vendas includes taxaNota in cost calculation
- resumo_margem_produto accepts from/to params and filters ItemVenda by venda.dataVenda
  </done>
</task>

</tasks>

<verification>
After both tasks, verify the changes compile:
```bash
cd /tmp/sitema-bfx && npx tsc --noEmit src/lib/ai-actions.ts 2>&1 | head -20
```
If tsc is not available or too slow, at minimum verify no syntax errors with:
```bash
node -e "require('fs').readFileSync('src/lib/ai-actions.ts','utf8')" && echo "File reads OK"
```
</verification>

<success_criteria>
1. AI criar_venda includes lucroLiquido in the created venda record
2. consultar_comissoes query includes itens and quantidade fields
3. resumo_relatorio_vendas totalCusto includes taxaNota deduction
4. resumo_margem_produto supports optional date filtering via from/to params
5. No TypeScript compilation errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/260323-dyu-busque-por-mais-poss-veis-falhas-de-l-gi/260323-dyu-SUMMARY.md`
</output>
