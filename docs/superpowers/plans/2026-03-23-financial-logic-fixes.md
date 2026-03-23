# Financial Logic Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 14 falhas de lógica nos cálculos financeiros, ordenadas de menor para maior severidade (LOW → CRITICAL).

**Architecture:** Todas as correções são cirúrgicas — nenhuma nova abstração é introduzida. Cada task toca apenas os arquivos necessários para aquele bug. Tasks de schema (MEDIUM-08) geram migração Prisma; as demais são só código TypeScript.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, TypeScript

---

## Arquivos Modificados (visão geral)

| Arquivo | Tasks |
|---------|-------|
| `src/app/(app)/venda-rapida/actions.ts` | Task 1 |
| `src/app/(app)/historico/actions.ts` | Task 2 |
| `src/lib/finance.ts` | Tasks 3, 4, 7, 8, 11 |
| `src/app/(app)/dashboard/page.tsx` | Task 5 |
| `src/app/api/comissoes/route.ts` | Task 6 |
| `prisma/schema.prisma` | Task 9 |
| `src/app/api/importacao/batch/route.ts` + `src/lib/validations/importacao.ts` | Task 10 |
| `src/lib/ai-actions.ts` | Task 13 |

---

## Task 1 — LOW-01: Arredondar `valorParcela` em `criarVenda` V1

**Problema:** `venda-rapida/actions.ts:36` — `parcela = total / parcelas` armazena float bruto. A V2 usa `Math.trunc((x/n)*100)/100`. A V1 não.

**Files:**
- Modify: `src/app/(app)/venda-rapida/actions.ts:36`

- [ ] **Step 1: Aplicar o arredondamento**

Trocar a linha 36:
```typescript
// ANTES
const parcela = parcelas > 0 ? total / parcelas : 0;

// DEPOIS
const parcela = parcelas > 0 ? Math.trunc((total / parcelas) * 100) / 100 : 0;
```

- [ ] **Step 2: Verificar que a lógica está correta**

```bash
node -e "
const total = 100; const n = 3;
console.log(Math.trunc((total/n)*100)/100); // 33.33
console.log(Math.trunc((total/n)*100)/100 * n); // 99.99 (aceitável)
"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/venda-rapida/actions.ts
git commit -m "fix(venda-rapida): arredondar valorParcela em criarVenda V1 (LOW-01)"
```

---

## Task 2 — LOW-04: Preservar semântica de `valorVenda` após edição multi-item

**Problema:** `historico/actions.ts:77` — ao editar uma venda com múltiplos itens, `valorVenda` é setado com a soma de todos os subtotais (`subtotal`). Mas o campo originalmente guarda o preço unitário do primeiro produto. Após uma edição, código legado que lê `valorVenda` recebe o total e não o preço unitário.

**Decisão:** Preservar o preço unitário do primeiro item no campo `valorVenda` (consistente com `criarVendaV2` linha 142). O campo `quantidade` já recebe a soma das quantidades (linha 76) — então `valorVenda * quantidade_total` continuaria errado. O correto é que código legado use `valorTotalVenda()` que soma os subtotais dos itens. O campo `valorVenda` em si deve manter o preço unitário do primeiro item para não mudar semântica.

**Files:**
- Modify: `src/app/(app)/historico/actions.ts:77`

- [ ] **Step 1: Corrigir o valor setado**

Na linha 77 de `historico/actions.ts`:
```typescript
// ANTES
valorVenda: itens.length > 0 ? subtotal : valorLegado,

// DEPOIS — mantém preço unitário do primeiro item (consistente com criarVendaV2)
valorVenda: itens.length > 0 ? (itens[0]?.valorVenda ?? 0) : valorLegado,
```

- [ ] **Step 2: Verificar que `subtotal` ainda é correto para `lucro`**

As linhas 36-44 já calculam `subtotal` e `lucro` corretamente usando `itens.reduce(subtotal)`. Nenhuma outra mudança necessária.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/historico/actions.ts
git commit -m "fix(historico): preservar preço unitário em valorVenda após edição multi-item (LOW-04)"
```

---

## Task 3 — LOW-03: Corrigir total de vendas antecipadas no fluxo de caixa

**Problema:** `finance.ts:148` — para vendas antecipadas, o cálculo usa `v.valorParcela * v.parcelas`. Devido ao truncamento de 2 casas decimais, a soma pode diferir do total (ex: 100/3 → 33.33 × 3 = 99.99, não 100.00).

> **⚠️ Nota de dependência:** Esta task será **substituída por Task 12** (CRITICAL-04), que reescreve toda a função `calcularFluxoCaixa` incluindo este trecho. Se implementar em ordem, **pule esta task e aplique a correção diretamente em Task 12**. Se implementar esta task antes de Task 12, é necessário adicionar `include: { itens: { select: { subtotal: true } } }` à query de vendas para que `valorTotalVenda` funcione corretamente com vendas V2 (sem isso, cai no fallback legado).

**Files:**
- Modify: `src/lib/finance.ts:148`

- [ ] **Step 1: Adicionar `include` de itens na query de vendas (necessário para `valorTotalVenda` em V2)**

```typescript
// Na linha 134, trocar:
const vendas = await prisma.venda.findMany();
// Por:
const vendas = await prisma.venda.findMany({
  include: { itens: { select: { subtotal: true } } },
});
```

- [ ] **Step 2: Substituir a reconstituição pelo `valorTotalVenda`**

Na função `calcularFluxoCaixa`, linha 148:
```typescript
// ANTES
entradas += (v.valorParcela || 0) * (v.parcelas || 0);

// DEPOIS — usa o total real da venda sem reconstruir de parcelas
entradas += valorTotalVenda(v);
```

O import de `valorTotalVenda` já existe no arquivo (linha 2).

- [ ] **Step 3: Commit**

```bash
git add src/lib/finance.ts
git commit -m "fix(finance): usar valorTotalVenda em antecipadas no fluxo de caixa (LOW-03)"
```

---

## Task 4 — LOW-02: Arredondar saídas de agregações financeiras em `finance.ts`

**Problema:** Múltiplos `reduce` acumulam erros de ponto flutuante IEEE 754. Os valores retornados por `calcularMetricasPeriodo` podem ter casas decimais espúrias (ex: `1234.5600000000002`).

**Files:**
- Modify: `src/lib/finance.ts` (bloco `return` de `calcularMetricasPeriodo`)

- [ ] **Step 1: Arredondar os valores finais no return**

No bloco `return` da função `calcularMetricasPeriodo` (linhas 77-91), aplicar `Math.round(x * 100) / 100` em todos os valores monetários:

```typescript
return {
  receita:    Math.round(receita    * 100) / 100,
  cmv:        Math.round(cmv        * 100) / 100,
  freteReal:  Math.round(freteReal  * 100) / 100,
  comissoes:  Math.round(comissoes  * 100) / 100,
  custosVar:  Math.round(custosVar  * 100) / 100,
  fixas:      Math.round(fixas      * 100) / 100,
  variaveis:  Math.round(variaveis  * 100) / 100,
  margem:     Math.round(margem     * 100) / 100,
  lucro:      Math.round(lucro      * 100) / 100,
  margemPct,   // porcentagem — não arredondar aqui, usar no display
  pontoEq:    Math.round(pontoEq    * 100) / 100,
  totalVendas: vendas.length,
  porVendedor,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/finance.ts
git commit -m "fix(finance): arredondar saídas de calcularMetricasPeriodo para evitar drift de float (LOW-02)"
```

---

## Task 5 — MEDIUM-01: Top Produtos no dashboard deve usar ItemVenda

**Problema:** `dashboard/page.tsx:89-104` — busca `produtoNome` do campo legado na tabela `Venda`. Para vendas V2 (multi-produto), só aparece o primeiro produto (ou vazio). Os produtos dos `ItemVenda` são ignorados.

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx:89-104`

- [ ] **Step 1: Substituir a query de vendas por ItemVenda**

```typescript
// ANTES (linhas 89-104)
const vendasProd = await prisma.venda.findMany({
  where: {
    dataVenda: { gte: start, lte: end },
    vendedor: vendorsFilter ? { in: vendorsFilter } : undefined,
  },
  select: { produtoNome: true },
});
const prodCount: Record<string, number> = {};
vendasProd.forEach((v) => {
  const name = v.produtoNome || "Produto";
  prodCount[name] = (prodCount[name] || 0) + 1;
});

// DEPOIS — usa ItemVenda para V2 e fallback para campo legado
const vendasProd = await prisma.venda.findMany({
  where: {
    dataVenda: { gte: start, lte: end },
    vendedor: vendorsFilter ? { in: vendorsFilter } : undefined,
  },
  select: {
    produtoNome: true,
    itens: { select: { produtoNome: true, quantidade: true } },
  },
});
const prodCount: Record<string, number> = {};
vendasProd.forEach((v) => {
  if (v.itens && v.itens.length > 0) {
    v.itens.forEach((i) => {
      const name = i.produtoNome || "Produto";
      prodCount[name] = (prodCount[name] || 0) + (i.quantidade || 1);
    });
  } else {
    const name = v.produtoNome || "Produto";
    prodCount[name] = (prodCount[name] || 0) + 1;
  }
});
```

> Nota: agora o `value` em `topProd` representa **unidades vendidas**, não número de pedidos. Isso é mais útil para produto popular.

- [ ] **Step 2: Verificar que o componente que consome `topProd` exibe corretamente**

Buscar usos de `topProd` no mesmo arquivo e confirmar que o campo `value` (número) ainda é coerente no contexto de exibição.

```bash
grep -n "topProd" src/app/(app)/dashboard/page.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "fix(dashboard): top produtos usa ItemVenda para contagem correta em vendas multi-produto (MEDIUM-01)"
```

---

## Task 6 — MEDIUM-09 + CRITICAL-03: Padronizar base de cálculo de comissão (receita)

**Problema:** Inconsistência entre:
- `finance.ts:60` → comissão = `vendorTotal * pct` (% da **receita**)
- `/api/comissoes/route.ts:43` → comissão = `lucroLiquido * pct` (% do **lucro**)
- `/api/comissoes/detalhe/route.ts:46` → idem, usa `lucroLiquido`
- `/perfil/page.tsx` → idem, usa `lucroLiquido`

**Decisão:** Padronizar em **% da receita** em todos os lugares. Razão: comissão sobre lucro cria dependência circular no DRE (comissão é deduzida para calcular o lucro, mas seria calculada sobre o lucro). % da receita é o padrão em vendas e não tem dependência circular.

**Files:**
- Modify: `src/app/api/comissoes/route.ts`
- Modify: `src/app/api/comissoes/detalhe/route.ts`
- Modify: `src/app/(app)/perfil/page.tsx` (se calcular localmente)

- [ ] **Step 1: Atualizar `/api/comissoes/route.ts` para usar receita**

```typescript
// No topo do arquivo, adicionar:
import { valorTotalVenda } from '@/lib/venda-utils';

// Trocar o select de vendas (remover lucroLiquido, adicionar campos para valorTotalVenda):
const vendas = await prisma.venda.findMany({
  where,
  select: {
    vendedor: true,
    valorVenda: true,
    quantidade: true,
    valorFrete: true,
    itens: { select: { subtotal: true } },
  },
});

// Atualizar o loop de cálculo:
vendas.forEach(venda => {
  if (venda.vendedor) {
    const percentual = comissaoPctMap.get(venda.vendedor);
    if (percentual !== undefined) {
      const receita = valorTotalVenda(venda);
      const comissao = (receita * percentual) / 100;
      comissoesPorVendedor.set(venda.vendedor, (comissoesPorVendedor.get(venda.vendedor) || 0) + comissao);
    }
  }
});
```

- [ ] **Step 2: Atualizar `/api/comissoes/detalhe/route.ts` — aplicar a mesma lógica**

Ler o arquivo, localizar onde usa `lucroLiquido` para calcular comissão (linha ~46), e trocar por:
```typescript
import { valorTotalVenda } from '@/lib/venda-utils';

// Na query, trocar `lucroLiquido: true` por:
valorVenda: true,
quantidade: true,
valorFrete: true,
itens: { select: { subtotal: true } },

// No cálculo:
const receita = valorTotalVenda(venda);
const valorComissao = percentual !== undefined ? (receita * percentual) / 100 : 0;
```

- [ ] **Step 3: Verificar e corrigir `perfil/page.tsx`**

```bash
grep -n "lucroLiquido\|comissao" src/app/\(app\)/perfil/page.tsx | head -20
```

Se o arquivo recalcula comissão com `lucroLiquido`, aplicar a mesma substituição: trocar `lucroLiquido` por `valorTotalVenda(venda)` (adicionando o import e os campos necessários na query).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/comissoes/route.ts src/app/api/comissoes/detalhe/route.ts src/app/\(app\)/perfil/page.tsx
git commit -m "fix(comissoes): padronizar cálculo de comissão em % da receita em todos os endpoints (MEDIUM-09, CRITICAL-03)"
```

---

## Task 7 — MEDIUM-07: Substituir boundary `Date(-1ms)` por `lt` no DRE

**Problema:** `finance.ts:98` — `new Date(Date.UTC(ano, mes, 1, 0, 0, 0, -1))` cria um timestamp com `-1ms` para obter o último milissegundo do mês. Funciona mas é frágil e não intuitivo.

**Files:**
- Modify: `src/lib/finance.ts` (função `calcularDre`)

- [ ] **Step 1: Trocar `lte fimInclusivo` por `lt fimExclusivo`**

```typescript
// ANTES (linhas 96-98 e a query interna de calcularMetricasPeriodo)
const ini = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
const fimInclusivo = new Date(Date.UTC(ano, mes, 1, 0, 0, 0, -1));
// ...
const metrics = await calcularMetricasPeriodo(ini, fimInclusivo);
```

Mudar a assinatura de `calcularMetricasPeriodo` para aceitar `endExclusive` e usar `lt`:

```typescript
// Em calcularDre:
const ini = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
const fim = new Date(Date.UTC(ano, mes, 1, 0, 0, 0)); // início do próximo mês (exclusivo)
const metrics = await calcularMetricasPeriodo(ini, fim);
```

```typescript
// Em calcularMetricasPeriodo — trocar o parâmetro `end` de lte para lt:
// Renomear `end` para deixar claro que é exclusivo na query Prisma
const vendas = await prisma.venda.findMany({
  where: {
    dataVenda: { gte: start, lt: end },  // lt em vez de lte
    // ...
  },
});
```

**⚠️ BREAKING CHANGE — Atualizar todos os callers de `calcularMetricasPeriodo`:**

A função passa a usar `lt: end` (exclusivo). Qualquer caller que passava `end = ultimo_ms_do_dia (23:59:59.999)` agora deve passar `end = inicio_do_dia_seguinte (00:00:00.000)`.

Identificar callers:
```bash
grep -rn "calcularMetricasPeriodo" src/
```

O caller em `dashboard/page.tsx` atualmente passa `end` como `23:59:59.999`. Após a mudança, deve passar o início do dia seguinte:

```typescript
// Em dashboard/page.tsx — localizar onde `end` é montado e ajustar:
// ANTES (provavelmente algo como):
const end = new Date(sp.to + "T23:59:59.999Z");

// DEPOIS — passar início do próximo dia (exclusivo):
const endDate = new Date(sp.to + "T00:00:00.000Z");
endDate.setUTCDate(endDate.getUTCDate() + 1); // + 1 dia
const end = endDate;
```

Verificar todos os outros callers e aplicar o mesmo ajuste.

- [ ] **Step 2: Remover os `console.log` de debug em `calcularDre`**

```typescript
// Remover linhas 100 e 104:
console.log(`Buscando vendas para ${mesAno} entre ...`);
console.log(`Vendas encontradas: ${metrics.totalVendas}`);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/finance.ts
git commit -m "fix(finance): substituir Date(-1ms) por lt exclusivo em calcularDre (MEDIUM-07)"
```

---

## Task 8 — MEDIUM-06: Adicionar filtro de data em `calcularFluxoCaixa`

**Problema:** `finance.ts:134` — `prisma.venda.findMany()` sem filtro carrega toda a tabela de vendas na memória. O loop depois filtra mês a mês em JS.

**Files:**
- Modify: `src/lib/finance.ts` (função `calcularFluxoCaixa`)

- [ ] **Step 1: Calcular o intervalo da janela de 6 meses antes da query**

```typescript
export async function calcularFluxoCaixa(mesAno?: string) {
  let referenceDate = new Date();
  if (mesAno) {
    const [ano, mes] = mesAno.split("-").map(Number);
    referenceDate = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  }

  // Janela: do mês de referência até 6 meses adiante
  const windowStart = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    1
  ));
  const windowEnd = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth() + 7, // 6 meses + margem de 1 mês para parcelas
    1
  ));

  const rows: { mes: string; entradas: number; saidas: number; saldo: number }[] = [];
  const vendas = await prisma.venda.findMany({
    where: { dataVenda: { gte: windowStart, lt: windowEnd } },
  });
  const despesas = await prisma.despesa.findMany({
    where: { dataDespesa: { gte: windowStart, lt: windowEnd } },
  });

  // ... restante do loop inalterado
```

- [ ] **Step 2: Ajustar o filtro de despesas no loop**

O loop de despesas já faz `filter()` em JS — após adicionar o `where` na query, o filtro JS interno pode ser simplificado (mas deixá-lo não quebra nada — é redundante, não errado).

- [ ] **Step 3: Commit**

```bash
git add src/lib/finance.ts
git commit -m "fix(finance): filtrar janela de 6 meses em calcularFluxoCaixa em vez de carregar tudo (MEDIUM-06)"
```

---

## Task 9 — MEDIUM-08: Adicionar campo `status` em Venda (migração Prisma)

**Problema:** Não há como cancelar ou estornar uma venda sem deletá-la. Toda venda conta nos cálculos financeiros independente de seu estado real.

**Decisão de escopo:** Adicionar o campo ao schema + filtrar nas métricas. A UI de cancelamento fica fora do escopo deste plano.

**Files:**
- Modify: `prisma/schema.prisma`
- New migration via `npx prisma migrate dev`
- Modify: `src/lib/finance.ts` (filtrar `status != "cancelada"`)

- [ ] **Step 1: Adicionar campo ao schema**

Em `prisma/schema.prisma`, no model `Venda`, após a linha `boleto`:

```prisma
status String @default("ativa") // "ativa" | "cancelada" | "estornada"
```

- [ ] **Step 2: Gerar a migração**

```bash
cd /tmp/sitema-bfx
npx prisma migrate dev --name add-venda-status
```

Verificar que o arquivo de migração foi criado em `prisma/migrations/`.

- [ ] **Step 3: Regenerar o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 4: Filtrar vendas canceladas/estornadas em `calcularMetricasPeriodo`**

```typescript
// finance.ts — adicionar ao where da query:
const vendas = await prisma.venda.findMany({
  where: {
    dataVenda: { gte: start, lt: end },
    vendedor: vendorsFilter ? { in: vendorsFilter } : undefined,
    status: { not: { in: ["cancelada", "estornada"] } },
  },
  // ...
});
```

- [ ] **Step 5: Aplicar o mesmo filtro em `calcularFluxoCaixa`**

```typescript
const vendas = await prisma.venda.findMany({
  where: {
    dataVenda: { gte: windowStart, lt: windowEnd },
    status: { not: { in: ["cancelada", "estornada"] } },
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/finance.ts
git commit -m "feat(schema): adicionar campo status em Venda + filtrar canceladas nas métricas (MEDIUM-08)"
```

---

## Task 10 — CRITICAL-05: Importação em lote deve descontar `taxaNota` do lucro

**Problema:** `importacao/batch/route.ts:36` — `lucro = total - (custoProduto + custoEnvio)` não subtrai o custo da nota fiscal. Vendas importadas com `temNota = true` terão lucro inflado.

**Files:**
- Modify: `src/lib/validations/importacao.ts` (adicionar `temNota` e `taxaNota`)
- Modify: `src/app/api/importacao/batch/route.ts:36` (usar `valorDescontoNota` no cálculo)

- [ ] **Step 1: Adicionar `temNota` e `taxaNota` ao schema de importação**

Em `src/lib/validations/importacao.ts`, após o campo `antecipada`:

```typescript
temNota: z
  .union([z.boolean(), z.number(), z.string()])
  .optional()
  .transform((v) => Boolean(v && v !== "0" && v !== 0 && String(v).toLowerCase() !== "n" && String(v).toLowerCase() !== "false")),
taxaNota: z.unknown().optional().default(5.97).transform((v) => {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return isNaN(n) || n <= 0 ? 5.97 : n;
}),
```

- [ ] **Step 2: Usar `valorDescontoNota` no cálculo de lucro em `batch/route.ts`**

```typescript
// ANTES (linha 34-36)
const total = valorVenda + frete;
const valorParcela = parcelas > 0 ? Math.trunc((total / parcelas) * 100) / 100 : 0;
const lucro = total - (custoProduto + custoEnvio);

// DEPOIS
const temNota = row.temNota ?? false;
const taxaNota = row.taxaNota ?? 5.97;
const total = valorVenda + frete;
const valorParcela = parcelas > 0 ? Math.trunc((total / parcelas) * 100) / 100 : 0;
const valorDescontoNota = temNota ? Math.trunc((valorVenda * taxaNota / 100) * 100) / 100 : 0;
const lucro = total - (custoProduto + custoEnvio + valorDescontoNota);
```

E incluir `temNota` e `taxaNota` no `tx.venda.create`:

```typescript
await tx.venda.create({
  data: {
    // ... campos existentes ...
    temNota,
    taxaNota,
    lucroLiquido: lucro,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/importacao.ts src/app/api/importacao/batch/route.ts
git commit -m "fix(importacao): incluir taxaNota no cálculo de lucro na importação em lote (CRITICAL-05)"
```

---

## Task 11 — MEDIUM-03: Lucro por vendedor deve ser calculado dinamicamente

**Problema:** `finance.ts:52` — `porVendedor[key].lucroLiquido += v.lucroLiquido || 0` usa o valor armazenado no banco (pode ser null em vendas antigas, ou desatualizado se os custos mudaram). O KPI principal de lucro é calculado dinamicamente, mas a tabela de equipe no dashboard usa o valor salvo — os números não reconciliam.

**Files:**
- Modify: `src/lib/finance.ts:47-54`

- [ ] **Step 1: Calcular lucroLiquido por vendedor dinamicamente**

A função já tem `cmv` calculado dinamicamente por venda. Precisamos de uma fórmula por vendedor. O lucro por vendedor = receita do vendedor - cmv do vendedor - frete do vendedor - comissão do vendedor - sua parte nas despesas variáveis (impossível separar por vendedor sem mais dados).

**Abordagem prática:** Calcular o lucro bruto por vendedor (receita - CMV direto - frete) e exibir como "lucro bruto", sem deduzir comissões e despesas compartilhadas (que são globais).

```typescript
for (const v of vendas) {
  const key = v.vendedor || "Sem Vendedor";
  porVendedor[key] ||= { total: 0, lucroLiquido: 0, vendas: 0 };
  porVendedor[key].total += valorTotalVenda(v);
  porVendedor[key].vendas += 1;

  // Calcular lucro bruto dinâmico: receita - CMV - frete
  const recVenda = valorTotalVenda(v);
  const cmvVenda = v.itens && v.itens.length > 0
    ? v.itens.reduce((s, i) => s + (i.custoProduto || 0) * (i.quantidade || 1), 0)
    : (v.custoProduto || 0);
  const freteVenda = v.custoEnvio || 0;
  const notaVenda = v.temNota
    ? (recVenda - (v.valorFrete ?? 0)) * ((v.taxaNota ?? 5.97) / 100)
    : 0;
  porVendedor[key].lucroLiquido += recVenda - cmvVenda - freteVenda - notaVenda;
}
```

A query `include` já busca `custoProduto`, `quantidade`, `subtotal` dos itens (linha 35 do arquivo atualizado). Adicionar `temNota` e `taxaNota` ao include:

```typescript
include: {
  itens: { select: { subtotal: true, custoProduto: true, quantidade: true } },
},
// E no select principal da venda (implícito em include) já inclui temNota, taxaNota
```

Verificar se `temNota` e `taxaNota` estão disponíveis no objeto `v` (sim, pois `include` retorna todos os campos da Venda).

- [ ] **Step 2: Commit**

```bash
git add src/lib/finance.ts
git commit -m "fix(finance): calcular lucroLiquido por vendedor dinamicamente em vez de usar valor salvo (MEDIUM-03)"
```

---

## Task 12 — CRITICAL-04: Fluxo de caixa deve usar `ParcelaVencimento`

**Problema:** `finance.ts:143-160` — A projeção de fluxo de caixa usa a heurística "se dataVenda <= dia 20, vencimento começa no mês seguinte; senão, no mês +2" com parcelas mensais. Vendas V2 criam registros `ParcelaVencimento` com datas reais — que são completamente ignoradas.

**Files:**
- Modify: `src/lib/finance.ts` (função `calcularFluxoCaixa`)

- [ ] **Step 1: Consultar `ParcelaVencimento` para o período**

```typescript
export async function calcularFluxoCaixa(mesAno?: string) {
  let referenceDate = new Date();
  if (mesAno) {
    const [ano, mes] = mesAno.split("-").map(Number);
    referenceDate = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  }

  const windowStart = new Date(Date.UTC(
    referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1
  ));
  const windowEnd = new Date(Date.UTC(
    referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 7, 1
  ));

  const rows: { mes: string; entradas: number; saidas: number; saldo: number }[] = [];

  // Buscar parcelas com datas reais (V2)
  const parcelas = await prisma.parcelaVencimento.findMany({
    where: { dataVencimento: { gte: windowStart, lt: windowEnd } },
    select: { dataVencimento: true, valorParcela: true, vendaId: true },
  });

  // Buscar vendas sem ParcelaVencimento (V1/legadas) no período + margem
  const vendasComParcela = new Set(parcelas.map((p) => p.vendaId));
  const vendasLegadas = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: windowStart, lt: windowEnd },
      status: { not: { in: ["cancelada", "estornada"] } },
      // Excluir vendas que já têm ParcelaVencimento
      NOT: { id: { in: Array.from(vendasComParcela) } },
    },
    select: {
      id: true, dataVenda: true, valorParcela: true, parcelas: true,
      antecipada: true, valorVenda: true, quantidade: true, valorFrete: true,
      itens: { select: { subtotal: true } },
    },
  });

  const despesas = await prisma.despesa.findMany({
    where: { dataDespesa: { gte: windowStart, lt: windowEnd } },
  });

  for (let i = 0; i < 6; i++) {
    const ref = addMonths(referenceDate, i);
    const mesStr = format(ref, "yyyy-MM");
    const mesNome = format(ref, "MM/yyyy");
    let entradas = 0;

    // Entradas de ParcelaVencimento reais (V2)
    for (const p of parcelas) {
      const pStr = format(p.dataVencimento, "yyyy-MM");
      if (pStr === mesStr) entradas += p.valorParcela;
    }

    // Entradas de vendas legadas (V1 — sem ParcelaVencimento)
    for (const v of vendasLegadas) {
      const dv = v.dataVenda;
      const dvStr = `${dv.getUTCFullYear()}-${String(dv.getUTCMonth() + 1).padStart(2, "0")}`;
      if (v.antecipada === 1) {
        if (dvStr === mesStr) entradas += valorTotalVenda(v);
      } else {
        const dia = dv.getUTCDate();
        const base = new Date(Date.UTC(dv.getUTCFullYear(), dv.getUTCMonth(), 1));
        const inicio = addMonths(base, dia <= 20 ? 1 : 2);
        for (let p = 0; p < (v.parcelas || 0); p++) {
          const venc = addMonths(inicio, p);
          const vencStr = `${venc.getUTCFullYear()}-${String(venc.getUTCMonth() + 1).padStart(2, "0")}`;
          if (vencStr === mesStr) entradas += v.valorParcela || 0;
        }
      }
    }

    const saidas = despesas
      .filter((d) => {
        const dd = d.dataDespesa;
        const ddStr = `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, "0")}`;
        return ddStr === mesStr;
      })
      .reduce((s, d) => s + (d.valor || 0), 0);

    rows.push({ mes: mesNome, entradas: Math.round(entradas * 100) / 100, saidas: Math.round(saidas * 100) / 100, saldo: Math.round((entradas - saidas) * 100) / 100 });
  }
  return rows;
}
```

> **Nota:** Verificar se `format` de `date-fns` está importado (já está, linha 3 do arquivo).

- [ ] **Step 2: Verificar que `ParcelaVencimento` existe no schema**

```bash
grep -A5 "model ParcelaVencimento" prisma/schema.prisma
```

Confirmar campos: `dataVencimento`, `valorParcela`, `vendaId`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/finance.ts
git commit -m "fix(finance): fluxo de caixa usa ParcelaVencimento para datas reais (V2), fallback heurístico para V1 (CRITICAL-04)"
```

---

## Task 13 — CRITICAL-02: AI `criar_venda` deve criar registro `ItemVenda`

**Problema:** `ai-actions.ts:821-845` — A ação de IA cria apenas o registro `Venda` com campos legados (`produtoNome`, `custoProduto`, `valorVenda`). Nenhum `ItemVenda` é criado. Resultado: vendas criadas pela IA são invisíveis em `resumo_margem_produto` e `margem-produto` API (que usam `ItemVenda`).

**Files:**
- Modify: `src/lib/ai-actions.ts` (case `criar_venda`)

- [ ] **Step 1: Criar `ItemVenda` junto com a `Venda` usando transação**

```typescript
case "criar_venda": {
  const vendedor = ctx.role === "admin" ? parsedParams?.vendedor : ctx.displayName;
  const valorVenda = parsedParams.valorVenda || 0;
  const valorFrete = parsedParams.valorFrete || 0;
  const custoProduto = parsedParams.custoProduto || 0;
  const custoEnvio = parsedParams.custoEnvio || 0;
  const total = valorVenda + valorFrete;
  const lucroLiquido = total - (custoProduto + custoEnvio);
  const parcelas = parsedParams.parcelas || 1;

  result = await prisma.$transaction(async (tx) => {
    const venda = await tx.venda.create({
      data: {
        uuid: uuidv7(),
        dataVenda: new Date(parsedParams.dataVenda),
        vendedor,
        clienteId: Number(parsedParams.clienteId),
        produtoNome: parsedParams.produtoNome,
        custoProduto,
        valorVenda,
        valorFrete,
        custoEnvio,
        lucroLiquido,
        parcelas,
        // Usa total (valorVenda + valorFrete) como base, consistente com todas as outras paths
        valorParcela: Math.trunc(((valorVenda + valorFrete) / parcelas) * 100) / 100,
        antecipada: parsedParams.antecipada ?? 0,
      },
    });

    // Criar ItemVenda para compatibilidade com relatórios V2
    await tx.itemVenda.create({
      data: {
        vendaId: venda.id,
        produtoNome: parsedParams.produtoNome || "",
        custoProduto,
        valorVenda,
        quantidade: 1,
        subtotal: valorVenda, // quantidade=1, sem desconto
      },
    });

    return venda;
  });
  break;
}
```

- [ ] **Step 2: Confirmar que `prisma.$transaction` está disponível no contexto**

```bash
grep -n "prisma\.\$transaction" src/lib/ai-actions.ts | head -3
```

Se não existe, verificar que `prisma` importado é o cliente Prisma padrão (é — vem de `@/lib/db`).

- [ ] **Step 3: Verificar que TypeScript não reclama do tipo de retorno**

O `result` no switch recebe o valor da transação. O type de `result` neste arquivo é `any` — sem problema.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai-actions.ts
git commit -m "fix(ai): criar_venda agora cria ItemVenda junto com Venda para compatibilidade com relatórios V2 (CRITICAL-02)"
```

---

## Checklist Final

- [ ] Task 1 (LOW-01): `valorParcela` arredondado em criarVenda V1
- [ ] Task 2 (LOW-04): `valorVenda` preserva preço unitário após edição no histórico
- [ ] Task 3 (LOW-03): Antecipadas usam `valorTotalVenda` no fluxo de caixa
- [ ] Task 4 (LOW-02): Saídas de `calcularMetricasPeriodo` arredondadas
- [ ] Task 5 (MEDIUM-01): Top Produtos usa `ItemVenda`
- [ ] Task 6 (MEDIUM-09 + CRITICAL-03): Comissão padronizada como % da receita
- [ ] Task 7 (MEDIUM-07): Date(-1ms) substituído por `lt` exclusivo
- [ ] Task 8 (MEDIUM-06): `calcularFluxoCaixa` tem filtro de janela na query
- [ ] Task 9 (MEDIUM-08): Campo `status` em Venda + migração + filtro nas métricas
- [ ] Task 10 (CRITICAL-05): Importação em lote desconta `taxaNota`
- [ ] Task 11 (MEDIUM-03): Lucro por vendedor calculado dinamicamente
- [ ] Task 12 (CRITICAL-04): Fluxo de caixa usa `ParcelaVencimento`
- [ ] Task 13 (CRITICAL-02): `criar_venda` da IA cria `ItemVenda`

---

## Notas de Implementação

**Ordem obrigatória:**
- Task 9 (schema `status`) deve vir **antes de Task 12** — Task 12 usa `status: { not: { in: [...] } }` na query Prisma, o que requer o campo existir no banco e no Prisma Client gerado. Sem Task 9, Task 12 não compila.
- Task 7 (`lt` exclusivo) deve vir **antes de Task 12** — Task 12 usa `lt` na query de vendas legadas.
- Task 8 (filtro de janela) é subsumida por Task 12 — se implementar em ordem, Task 12 já inclui o filtro de janela; não é necessário aplicar Task 8 separadamente.
- Task 3 (antecipada fix) é subsumida por Task 12 — idem.
- As demais tasks (1, 2, 4, 5, 6, 10, 11, 13) são independentes entre si.

**Schema migration (Task 9):** Requer `DATABASE_URL` válida no ambiente. Se o ambiente não tiver acesso ao banco em tempo de desenvolvimento, usar `prisma migrate dev --create-only` para gerar o SQL sem aplicar, e aplicar manualmente.

**Decisão de produto documentada:** A base de cálculo de comissão foi padronizada em **% da receita** (Task 6). Se a decisão de negócio for % do lucro, reverter Task 6 e aceitar a inconsistência no DRE como design proposital.
