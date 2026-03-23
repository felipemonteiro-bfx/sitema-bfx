---
phase: quick-260323-hdn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(app)/financeiro/page.tsx
autonomous: true
requirements:
  - ESTOQUE-01
  - ESTOQUE-02
  - ESTOQUE-03

must_haves:
  truths:
    - "Aba 'Estoque' aparece como 4a aba no /financeiro ao lado de DRE, Fluxo e Lançamentos"
    - "Card 'Valor Imobilizado' exibe custoPadrao * qtdEstoque somado de todos os produtos"
    - "Card 'Potencial de Receita' exibe valorVenda * qtdEstoque somado de todos os produtos"
    - "Card 'Margem Potencial' exibe percentual (potencialReceita - valorImobilizado) / potencialReceita"
    - "Card 'Itens Zerados' exibe contagem de produtos com qtdEstoque = 0 ou null"
    - "Tabela mostra produtos com colunas Produto | Qtd | Custo unit. | Valor em estoque | Preço venda | Margem % ordenados por maior valor imobilizado"
    - "No DRE Inteligente, card 'Capital em Estoque' aparece nos Detalhes com valor imobilizado total"
  artifacts:
    - path: "src/app/(app)/financeiro/page.tsx"
      provides: "aba Estoque + card Capital em Estoque no DRE"
      contains: "estoque"
  key_links:
    - from: "financeiro/page.tsx"
      to: "prisma.produto.findMany"
      via: "query direta no Server Component"
      pattern: "prisma\\.produto\\.findMany"
    - from: "QueryTabs"
      to: "aba estoque"
      via: "4o item do array tabs"
      pattern: "value.*estoque"
---

<objective>
Adicionar aba "Estoque" no /financeiro com visao de capital imobilizado em mercadorias, e linha "Capital em Estoque" nos detalhes do DRE Inteligente.

Purpose: Dar visibilidade financeira sobre o estoque — quanto esta preso em mercadoria, qual o potencial de receita e margem, e quais itens zerados precisam de reposicao.
Output: financeiro/page.tsx atualizado com 4a aba + card no DRE.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Interfaces relevantes do codebase:

```typescript
// prisma/schema.prisma — model Produto
model Produto {
  id          Int     @id @default(autoincrement())
  nome        String
  custoPadrao Float?  @map("custo_padrao")
  qtdEstoque  Int?    @default(0) @map("qtd_estoque")
  valorVenda  Float?  @default(0) @map("valor_venda")
  marca       String?
  categoria   String?
  // ...
}

// QueryTabs — componente ja importado na pagina
// Aceita: tabs: Array<{ value: string; label: string; content: React.ReactNode }>

// formatBRL(n: number) — ja importado, formata para R$
// cn(...) — ja importado

// Estrutura atual da pagina:
// QueryTabs com 3 tabs: "dre", "fluxo", "lanc"
// dre tab tem: grid 3 cards + Card "Detalhes" com grid sm:grid-cols-2 de 4 mini-cards
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Buscar dados de estoque e adicionar aba "Estoque" + card no DRE</name>
  <files>src/app/(app)/financeiro/page.tsx</files>
  <action>
Editar `src/app/(app)/financeiro/page.tsx` para:

**1. Adicionar query de produtos apos a query de despesas (linha ~99):**
```typescript
const produtos = await prisma.produto.findMany({
  select: { nome: true, custoPadrao: true, qtdEstoque: true, valorVenda: true },
  orderBy: [{ custoPadrao: "desc" }],
});
```

Depois ordenar por valor imobilizado (custoPadrao * qtdEstoque desc) antes de renderizar — re-sort no render para nao depender de campo calculado no banco:
```typescript
const produtosOrdenados = [...produtos].sort((a, b) => {
  const imobA = (a.custoPadrao ?? 0) * (a.qtdEstoque ?? 0);
  const imobB = (b.custoPadrao ?? 0) * (b.qtdEstoque ?? 0);
  return imobB - imobA;
});
```

**2. Calcular metricas de estoque (apos a query, antes do return):**
```typescript
const estoqueImobilizado = produtos.reduce(
  (s, p) => s + (p.custoPadrao ?? 0) * (p.qtdEstoque ?? 0), 0
);
const estoquePotencialReceita = produtos.reduce(
  (s, p) => s + (p.valorVenda ?? 0) * (p.qtdEstoque ?? 0), 0
);
const estoqueMargemPct = estoquePotencialReceita > 0
  ? ((estoquePotencialReceita - estoqueImobilizado) / estoquePotencialReceita) * 100
  : 0;
const estoqueItensZerados = produtos.filter(p => (p.qtdEstoque ?? 0) === 0).length;
```

**3. Adicionar card "Capital em Estoque" nos Detalhes do DRE.**

No JSX do tab "dre", dentro do `<div className="grid gap-3 sm:grid-cols-2">` que ja contem 4 mini-cards (CMV, Comissoes, Frete Real, Despesas Fixas), adicionar um 5o mini-card apos "Despesas Fixas":
```tsx
<div className="rounded-lg border border-dashed p-3">
  <div className="text-xs uppercase tracking-wide text-muted-foreground">Capital em Estoque</div>
  <div className="mt-1 text-base font-semibold text-amber-600">{formatBRL(estoqueImobilizado)}</div>
  <div className="text-xs text-muted-foreground">Valor imobilizado em mercadoria</div>
</div>
```

**4. Adicionar 4a aba "estoque" no array `tabs` do QueryTabs, DEPOIS de "lanc":**

```tsx
{
  value: "estoque",
  label: "Estoque",
  content: (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Valor Imobilizado</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-600">{formatBRL(estoqueImobilizado)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Potencial de Receita</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-success">{formatBRL(estoquePotencialReceita)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Margem Potencial</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{estoqueMargemPct.toFixed(1)}%</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Itens Zerados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{estoqueItensZerados}</CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Produtos em Estoque</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Valor em estoque</TableHead>
                <TableHead className="text-right">Preço venda</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosOrdenados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sem produtos cadastrados.
                  </TableCell>
                </TableRow>
              ) : (
                produtosOrdenados.map((p) => {
                  const imob = (p.custoPadrao ?? 0) * (p.qtdEstoque ?? 0);
                  const margem = p.valorVenda && p.valorVenda > 0
                    ? ((p.valorVenda - (p.custoPadrao ?? 0)) / p.valorVenda) * 100
                    : 0;
                  return (
                    <TableRow key={p.nome}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.qtdEstoque ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(p.custoPadrao ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-amber-600">{formatBRL(imob)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(p.valorVenda ?? 0)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", margem >= 30 ? "text-success" : margem >= 15 ? "text-amber-600" : "text-destructive")}>
                        {margem.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  ),
},
```

Nota: `produtosOrdenados` deve ser declarado dentro do escopo do Server Component (antes do return) para ficar disponivel no JSX. `produtos` query usa `select` sem `orderBy` no banco (a ordenacao e feita em JS com `.sort()`).

Nao importar nenhum novo componente — todos os usados (Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell) ja estao importados no topo do arquivo.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>
    - TypeScript compila sem erros em page.tsx
    - Aba "Estoque" aparece no /financeiro com 4 cards e tabela de produtos
    - Card "Capital em Estoque" aparece na secao Detalhes do DRE Inteligente
    - Tabela ordenada por maior valor imobilizado (custoPadrao * qtdEstoque desc)
    - Margem % colorida: verde >= 30%, ambar >= 15%, vermelho abaixo de 15%
  </done>
</task>

</tasks>

<verification>
`npx tsc --noEmit` passa sem erros em src/app/(app)/financeiro/page.tsx.
Navegar para /financeiro mostra 4 abas (DRE Inteligente, Fluxo de Caixa, Lancamentos, Estoque).
Aba Estoque mostra 4 cards + tabela de produtos.
Aba DRE Inteligente mostra 5 mini-cards nos Detalhes (incluindo Capital em Estoque).
</verification>

<success_criteria>
- Aba "Estoque" visivel e funcional em /financeiro
- 4 cards de resumo: Valor Imobilizado, Potencial de Receita, Margem Potencial, Itens Zerados
- Tabela de produtos com 6 colunas ordenada por maior valor imobilizado
- Card "Capital em Estoque" nos Detalhes do DRE Inteligente
- Zero novos imports necessarios (todos componentes ja existentes)
- TypeScript sem erros
</success_criteria>

<output>
Apos conclusao, criar `.planning/quick/260323-hdn-adicionar-aba-estoque-no-financeiro-com-/260323-hdn-SUMMARY.md` com o que foi implementado, arquivos modificados e resultado da verificacao.
</output>
