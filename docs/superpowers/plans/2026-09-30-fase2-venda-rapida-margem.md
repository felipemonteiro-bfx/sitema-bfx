# Fase 2 — Venda Rápida com margem real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar, antes de finalizar a venda, limite antes → depois, custos, repasse estimado e três cenários de antecipação (nenhuma, todas menos a última, todas) com lucro estimado e dinheiro disponível já — só simulação.

**Architecture:** Uma função pura `simularMargemVenda()` em `src/lib/simular-margem-venda.ts` recebe o que o formulário já tem e devolve números prontos; um componente `ResumoVendaPanel` renderiza dentro do card "Resumo Financeiro" existente (Seção 7 do `venda-rapida-form-v2.tsx`), acima do botão Finalizar. A fórmula da Prudent vem de `@/lib/antecipacao` (não reescrever). O repasse vem do payload do limite (Fase 1 já pôs `regraVencimento` lá; aqui entra `repassePct`).

**Tech Stack:** Next.js 15, React client component, vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md` §7.

## Global Constraints

- Worktree `/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx-fechamento`; testes com `DATABASE_URL=postgresql://x:y@localhost:5432/x npx vitest run`; linha de base: 8 arquivos falham por env (ver plano da Fase 1).
- **Nada novo é gravado.** `criarVendaV2`, `lucroLiquido` e `taxaFinanceiraValor` não mudam.
- Comissão no painel = mesma fórmula que o form já mostra (`lucroBruto * comissaoPct / 100`, `venda-rapida-form-v2.tsx:375`). Não "consertar" as outras telas.
- Repasse rotulado "estimado — regra a definir"; base = total da venda.
- Cor só por token semântico; nada de `text-[Npx]`; rodar `escala:check`, `cores:check`, `jsx:check`, `contraste:check`.
- **Visual:** seguir o artboard polido "Venda Rápida — Resumo financeiro" do artifact https://claude.ai/artifact/3zL1PK6awXfKA1pjpoxX4x (versão 3): dentro do card "Resumo financeiro", duas colunas (esquerda: "Limite do colaborador" com barra comprometido/esta venda/livre + "Custos da venda" em `<dl>`; direita: tabela "Antecipação na Prudent" com a coluna **Todas** destacada em `bg-success-bg`/`text-success-text` e a nota "é a que o lucro gravado considera hoje"). Títulos de grupo como `<h3>` em caixa normal (nada de rótulo em caixa alta acima de título). Depois da UI pronta, rodar a skill `impeccable` com `polish` no componente e `/Users/andrebrumcortezferreira/.claude/skills/impeccable/scripts/impeccable detect --json <arquivos>` uma vez; corrigir achados reais (Space Grotesk é a fonte do app — ignorar "overused-font").
- Commits por caminho explícito, trailers `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_012gGWB9ATfPTpnBjEZGDFGU`. Sem push.

## Review Focus

1. Venda em 1x → o cenário "todas menos a última" não aparece (seria igual a "nenhuma").
2. Forma de pagamento fora de desconto em folha → só o cenário "nenhuma"; "dinheiro já" = total para PIX, DINHEIRO, CARTAO_DEBITO e TRANSFERENCIA, 0 para as demais.
3. Sem datas de vencimento ainda (lista vazia) → cenários com taxa 0 e aviso "informe as parcelas".
4. Cliente sem renda/limite → bloco de limite some (não mostra R$ 0,00 como se fosse real).
5. Parcela já vencida em relação à data da venda → prazo 0, taxa 0 (regra da `prazoTituloDias`), sem NaN.

---

### Task 1: `simularMargemVenda` (pura)

**Files:** Create `src/lib/simular-margem-venda.ts`; Test `src/__tests__/simular-margem-venda.test.ts`.

**Interfaces — Consumes:** `titulosDeVenda`, `calcularAntecipacao`, `vendaEhAntecipavel`, `TAXA_MENSAL_PADRAO` de `@/lib/antecipacao` (assinaturas: `titulosDeVenda(venda: { dataVenda; valorVenda; parcelas; parcelas_detalhes? }, periodo?)`, `calcularAntecipacao(titulos, taxaMensal?) → { prazoMedioDias, taxaPercent, valorBruto, valorTaxa, valorLiquido }`, `vendaEhAntecipavel({ formaPagamento?, descontoEmFolha?, status? })`).

**Produces:**
```ts
export type CenarioAntecipacao = { chave: "nenhuma" | "menosUltima" | "todas"; rotulo: string; taxa: number; dinheiroJa: number; lucro: number };
export type SimulacaoMargem = {
  total: number;
  valorParcela: number;
  custos: { produtos: number; envio: number; nota: number; comissao: number; desconto: number };
  repasse: { pct: number; valor: number } | null;
  limite: { antes: number; depois: number } | null;
  cenarios: CenarioAntecipacao[];
  semParcelas: boolean;
};
export function simularMargemVenda(input: {
  dataVenda: string;                 // YYYY-MM-DD
  formaPagamento: string | null;
  subtotalProdutos: number;
  custoProdutos: number;             // Σ custoProduto × quantidade
  frete: number;                     // cobrado do cliente
  envio: number;                     // custo de envio
  desconto: number;                  // manual + pontos
  temNota: boolean;
  taxaNotaPct: number;
  comissaoPct: number;
  parcelas: { numeroParcela: number; dataVencimento: string; valorParcela: number }[];
  numParcelas: number;
  repassePct: number | null;
  disponivelAntes: number | null;    // do card de limite; null = sem limite conhecido
}): SimulacaoMargem;
```

Regras (arredondar tudo a centavo com `Math.round(x * 100) / 100`):
- `total = subtotalProdutos + frete − desconto`; `nota = temNota ? subtotalProdutos × taxaNotaPct / 100 : 0`.
- `lucroBruto = total − custoProdutos − envio − nota`; `comissao = lucroBruto × comissaoPct / 100` (mesmo do form).
- `repasse = repassePct ? { pct, valor: total × pct / 100 } : null`.
- `base = lucroBruto − comissao − (repasse?.valor ?? 0)`.
- `valorParcela = numParcelas > 0 ? total / numParcelas : 0`; `limite = disponivelAntes === null ? null : { antes, depois: antes − valorParcela }`.
- Cenários: se `vendaEhAntecipavel({ formaPagamento })` for falso → só `nenhuma` com `taxa 0`, `lucro = base`, `dinheiroJa = ["PIX","DINHEIRO","CARTAO_DEBITO","TRANSFERENCIA"].includes(formaPagamento) ? total : 0`.
  Se for antecipável: `nenhuma` (taxa 0, dinheiroJa 0, lucro base); `menosUltima` só se `parcelas.length >= 2`, com as parcelas exceto a de maior `numeroParcela`; `todas` com todas. Para um subconjunto: `const titulos = titulosDeVenda({ dataVenda, valorVenda: total, parcelas: subconjunto.length, parcelas_detalhes: subconjunto.map(p => ({ ...p, antecipada: false })) })`, `const r = calcularAntecipacao(titulos, TAXA_MENSAL_PADRAO)`; `taxa = r.valorTaxa`, `dinheiroJa = r.valorLiquido`, `lucro = base − taxa`.
- `semParcelas = parcelas.length === 0` (cenários antecipáveis ficam com taxa 0).
- Rótulos: "Nenhuma", "Todas menos a última" (quando `parcelas.length === 4`, pode ficar "3 de 4" — use `${n-1} de ${n}`), "Todas".

- [ ] **Step 1: Teste que falha** cobrindo: (a) folha 4x com vencimentos 30/60/90/120 dias após a venda → `cenarios.map(c => c.chave)` = `["nenhuma","menosUltima","todas"]`, rótulo do meio `"3 de 4"`, `todas.taxa` = `calcularAntecipacao(titulosDeVenda(...)).valorTaxa` calculado no próprio teste (não número mágico), `todas.lucro < menosUltima.lucro < nenhuma.lucro`; (b) 1x em folha → sem `menosUltima`; (c) PIX → um cenário, `dinheiroJa === total`; (d) BOLETO → um cenário, `dinheiroJa === 0`; (e) repasse 10% sobre total 1000 → `repasse.valor === 100` e `nenhuma.lucro` reduzido em 100; (f) `disponivelAntes: null` → `limite === null`; `disponivelAntes: 300`, total 400 em 4x → `{ antes: 300, depois: 200 }`; (g) parcelas vazias → `semParcelas: true`, taxas 0; (h) nota 5,97% sobre subtotal 1000 → `custos.nota === 59.7`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** rodar → PASS, e `src/__tests__/antecipacao-*.test.ts` continuam PASS.
- [ ] **Step 5: Commit** `feat(venda-rapida): simulacao de margem com cenarios de antecipacao`.

---

### Task 2: Repasse no payload do limite

**Files:** Modify `src/lib/consignado-db.ts` (`payloadLimiteCliente`), o tipo `LimiteClientePayload` em `src/lib/consignado-venda.ts:54`; Test: estender o teste existente do payload (procurar com `grep -rl payloadLimiteCliente src/__tests__`; se não houver, criar `src/__tests__/limite-payload-regra.test.ts` com `vi.mock("@/lib/db")` e `vi.mock("@/lib/regra-empresa-db")`).

- [ ] Adicionar `repassePct?: number | null` ao `LimiteClientePayload`, preenchido com a regra vigente hoje (`regraDoClienteNaData(clienteId, new Date())`, a mesma consulta que a Fase 1 já faz para `regraVencimento` — reaproveitar a variável, não consultar duas vezes).
- [ ] Teste: cliente cuja regra vigente tem `repassePct: 7` → payload traz `repassePct: 7`; sem regra → `null`.
- [ ] Commit `feat(limite): repasse da regra vigente no payload do limite`.

---

### Task 3: `ResumoVendaPanel` no formulário

**Files:** Create `src/components/resumo-venda-panel.tsx`; Modify `src/components/venda-rapida-form-v2.tsx` (Seção 7, ~l.1299–1379: inserir o painel acima do botão Finalizar, sem remover os tiles existentes).

- [ ] Componente client, props `{ simulacao: SimulacaoMargem }`, puramente apresentacional: bloco "Limite do colaborador" (antes → depois, só se `limite`), tabela de custos (Produtos, Envio, Nota fiscal, Comissão, Desconto, e "Repasse à empresa" com etiqueta "estimado — regra a definir" quando houver), tabela de cenários (colunas = cenários; linhas Taxa, Dinheiro já, Lucro estimado; lucro negativo em `text-destructive`), rodapé "Simulação — nada disso é gravado na venda." e, se `semParcelas`, aviso "Informe as datas das parcelas para simular a antecipação." Formatar com `formatBRL` de `@/lib/utils`. Usar `Table` do shadcn (`@/components/ui/table`) — consultar a skill `shadcn-bfx`. Seguir o artboard "Venda Rápida — Resumo da venda" do artifact https://claude.ai/artifact/3zL1PK6awXfKA1pjpoxX4x (conteúdo e ordem dos blocos; visual com os tokens do sistema).
- [ ] No form: `const simulacao = useMemo(() => simularMargemVenda({ dataVenda, formaPagamento, subtotalProdutos, custoProdutos: Σ, frete: numFrete, envio: numEnvio, desconto: desconto + descontoPontos, temNota, taxaNotaPct: numTaxaNota, comissaoPct, parcelas: parcelasVencimento, numParcelas, repassePct: limiteData?.repassePct ?? null, disponivelAntes: cardLimite?.disponivel ?? null }), [...])` — usar as variáveis que já existem nas l.352–387 (conferir os nomes reais).
- [ ] Rodar as quatro travas de design, `tsc` nos arquivos tocados e `npx eslint`.
- [ ] Commit `feat(venda-rapida): painel de resumo com margem real`.

### Task 4: Verificação

- [ ] Suíte inteira (só as 8 falhas de env da linha de base); `tsc` sem erro novo; travas de design.
