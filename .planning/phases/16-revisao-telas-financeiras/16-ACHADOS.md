# Fase 16 — Achados da revisão visual (telas financeiras)

**Revisor:** subagente dedicado com a skill `ui-ux-pro-max`
**Método:** Playwright em produção, contraste por composição em canvas (resolve `lab()` e alfa,
compondo contra o fundo efetivo subindo a cadeia de ancestrais). Sanity check 21.0 em 100% das
medições. Tema alternado por clique real. `getComputedStyle` comparado entre rotas.
**Telas:** `/financeiro` (4 abas), `/boletos` (4 abas), `/prudent`, `/comissoes`, `/relatorios`,
`/relatorios/mensais` — em 1440px e 390px, tema claro e escuro.

> **Inversão em relação à fase 15:** lá o escuro reprovava. Aqui o escuro passa em tudo (0
> reprovações) e o **claro** reprova — nos valores em dinheiro.

## Dado errado: nenhum

Receita − Custos = Lucro exato; CMV+Comissões+Frete+Fixas = Custos exato; soma de 208 linhas do
Estoque = card "Capital em Estoque" (7.706,02); soma de 115 linhas = Total de Comissões (2.063,54).
Observação de leitura: em `/comissoes` o `%` incide sobre **Venda** mas a coluna fica encostada em
**Lucro**. O número está certo; o vizinho engana.

## Alta

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 1 | financeiro, prudent, boletos, relatorios/mensais | `text-warning` ilegível no claro, usado em dinheiro | `rgb(224,171,34)` sobre card branco = **2.06:1**. "R$ 16.185,51" (20px/700) **1.86:1**; pílula 10px **1.86:1**. Escuro: 5.61–6.91 OK |
| 2 | financeiro, boletos, comissoes, prudent | `text-success` reprova no claro, inclusive no Lucro Líquido | `rgb(49,170,64)` sobre branco = **2.97:1** (24px/700 — limiar 3.0 até para texto grande) |
| 3 | financeiro, boletos | Rolagem horizontal da página em 390px | `scrollWidth` **505/506** vs `clientWidth` **390**. O `[role=tablist]` mede 476/477px e `overflow-x` é `visible` até `<main>`. As outras 4 rotas: 390/390 |
| 4 | prudent | `text-info` nas pílulas de parcela reprova no claro | `rgb(0,127,213)` sobre `rgb(190,219,241)` = **2.91:1**. Escuro 4.80 OK |

**Causa raiz de 1, 2 e 4 — inconsistência de origem, não regressão.** Em `globals.css` os tokens
claros são calibrados como **preenchimento**, não como texto. A linha 110 já registra 2.89:1 para
`--success` contra branco. E a linha 131 prova que a equipe sabe corrigir: `--destructive` teve o L
baixado de 0.60 para 0.57 para chegar a 4.69:1 **como texto**. Só o destructive recebeu isso.
O v1.2 não criou o problema — ao migrar 313 classes, espalhou-o para todo o financeiro.

## Média

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 5 | boletos | Botão "Buscar" mais baixo que o campo ao lado | `Input` 40px/radius 10/14px vs `buttonVariants({size:"sm"})` 36px/radius 8/12px. Padrão das outras 4 rotas: 40px |
| 6 | financeiro | KPIs de dinheiro sem `tabular-nums` | `/financeiro` 24px/700 → `normal`. Mesmo papel em `/boletos` e `/prudent` → `tabular-nums` |
| 7 | relatorios/mensais | Única tabela do conjunto sem `tabular-nums` nas colunas numéricas | `text-align:right` OK, `font-variant-numeric: normal`. Todas as irmãs usam tabular-nums |
| 8 | prudent | Dois cards irmãos de topo com variantes diferentes | Ambos w=1014px. Antecipação `variant="elevated"` (bg 238,242,247 + blur) vs histórico `<Card>` (bg 253,253,253, sem blur). Divergem nos dois temas |
| 9 | boletos, prudent | Sem breadcrumb, enquanto as outras 4 têm | `<PageHeader>` chamado sem a prop `breadcrumbs` |

## Baixa

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 10 | relatorios | Título e descrição sem acento | `<h1>` "Relatorios"; a rota filha e o breadcrumb escrevem "Relatórios" |
| 11 | comissoes | `Comissão (%)` sem `tabular-nums`, as 3 irmãs da mesma tabela têm | |
| 12 | financeiro, boletos | Abas inativas 0,03 abaixo do limiar no claro | `rgb(115,115,115)` sobre `rgb(248,248,248)` = **4.47:1** (limiar 4.5) |
| 13 | financeiro | Estado vazio sem respiro, diferente de `/boletos` | `TableCell colSpan` sem `py-*` (page.tsx:325, :463, :547); `/comissoes` e `/prudent` usam `py-8`. Três convenções de texto para o mesmo conceito |
| 14 | todas (chrome) | Badge "NOVO" da sidebar | **4.17:1** (10px/600). Mesma família do achado 10 da fase 15 |

## OK (registrado para não parecer omissão)

Tema escuro: zero reprovações. Sem rolagem horizontal em 1440px. Zero `<select>`/`<table>`/
`<textarea>` cru. `<PageHeader>` idêntico nas 6 rotas. Todas as colunas de dinheiro `text-right`.
Valor negativo não depende de cor (`Intl` emite o sinal).

## Não avaliado

`/boletos` sem Asaas (configurado em produção; mudar seria escrita) · estado vazio de `/financeiro`
(não consegui forçar período vazio) · botão de antecipação e envios de relatório (gravam) · guard
"Acesso restrito." de `/relatorios/mensais` (inalcançável como admin) · valor monetário negativo
renderizado (não havia nos dados).
