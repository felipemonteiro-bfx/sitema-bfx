# Phase 8: Estoque e identidade visual - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — UXP-04 foi **resolvido durante o discuss**, com evidência

<domain>
## Phase Boundary

Venda rápida deixa de exibir alertas de estoque baixo/sem estoque e o limite de quantidade por
estoque disponível, mantendo o decremento e a aba Estoque do `/financeiro` intactos; e o fundo do
sistema deixa de ter tom amarelado.

Cobre as demandas 1, 5 e 6 do cliente.

</domain>

<decisions>
## Implementation Decisions

### UXP-04 — RESOLVIDO no discuss, com evidência (não é mais tarefa de implementação)

A dúvida era: o "amarelo" que o cliente vê vem do CSS, de um build velho em produção, ou de um
filtro de tela? Investigado em 2026-08-03 contra o cluster de produção:

1. **Produção está com o build atual.** A imagem rodando é
   `bfx-shop:88268e909239e35b65bbdfb2da52bea6b9931af1` — o commit `88268e9`, feito hoje. A
   hipótese "build desatualizado" está **descartada**.
2. **O CSS realmente servido** (`/app/.next/static/chunks/cdaa6f7fb61cc7c2.css` dentro do pod)
   define `--background: #fdfaf3` e `--card: #fffdf8`.
3. `#fdfaf3` é um off-white **creme** (levemente quente), não o amarelo saturado dos screenshots.

**Conclusão dupla:**
- O amarelo *forte e uniforme* dos 3 prints — que cobre inclusive áreas que o CSS manda ser
  quase brancas — é **filtro de tela do lado do cliente** (Night Shift / f.lux / modo leitura).
  Nada no código produz aquilo.
- **Mas o cliente não está imaginando coisas.** O fundo tem, sim, tom quente: `#fdfaf3` não é
  branco. É exatamente isso que a demanda 6 ("trocar cor amarela por branco") descreve.

- **D-01 — UXP-05 vira "zerar o croma dos tokens de fundo", não "aplicar a paleta da marca".**
  Trocar `--background` e `--card` (e os equivalentes em `globals.css`, hoje escritos em `oklch`
  com croma 0.01 e matiz 90) por neutros de croma **0**. É a leitura literal da demanda 6, é
  reversível e **não depende dos hex oficiais da BFX**, que ninguém forneceu.

- **D-02 — A paleta completa da marca fica FORA desta fase.** "Esquema de cores não reflete as
  cores da BFX" (demanda 5) exige os hex oficiais (primary, accent, fundo). Sem eles, qualquer
  escolha seria chutar no escuro — precisamente o que o plano do Grok alertou para não fazer.
  Fica registrado como pendência do cliente. O que **dá** para entregar sem eles é D-01.

- **D-03 — Estoque: só some com os alertas.** Decisão do André. Remover da venda rápida o badge
  "Sem estoque", o alerta de `estoqueDisponivel <= 5` e o cap de quantidade. **Manter** o
  decremento de estoque na venda e a aba Estoque do `/financeiro` (capital imobilizado, potencial
  de receita). Totalmente reversível.

- **D-04 — Nada de tocar no cálculo financeiro.** UXP-03 é um requisito de não-regressão: a aba
  Estoque do `/financeiro` precisa continuar produzindo exatamente os mesmos números. O plano deve
  ter um teste que trave isso, não só a promessa.

</decisions>

<code_context>
## Existing Code Insights

- `src/components/produto-item-form.tsx:176-188` e `:324-328` — badge "Sem estoque" e o alerta de
  estoque baixo (`estoqueDisponivel <= 5`); é aqui que os alertas somem (UXP-01) e onde está o cap
  de quantidade (UXP-02).
- `src/app/(app)/venda-rapida/actions.ts:299-304` — o decremento de estoque, que **permanece**.
  (Nota: ele usa `updateMany({ where: { nome } })`, que atinge produtos homônimos — bug latente
  registrado como BUG-01 no REQUIREMENTS.md, **fora do escopo desta fase**.)
- `src/app/(app)/financeiro/page.tsx:103+` — a aba Estoque que não pode regredir (UXP-03).
- `src/app/globals.css:72` — `--background: oklch(0.985 0.01 90)`; o `0.01` de croma e o matiz
  `90` são a origem do tom creme. `:104` tem o equivalente para `--card`. O bloco dark (`:154+`)
  não está em questão — os prints do cliente são do tema claro.
- `tailwind.config.ts` — mapeia os tokens; não precisa mudar se só os valores em `globals.css`
  mudarem.

</code_context>

<specifics>
## Specific Ideas

- O teste de UXP-01/UXP-02 deve extrair a decisão para uma função pura (ex.: "deve exibir alerta
  de estoque?" / "há teto de quantidade?") e travá-la, em vez de tentar renderizar componente —
  o vitest não roda nesta máquina e o padrão que funcionou nas fases 5-7 foi módulo puro
  verificável por `node --input-type=module`.
- Para UXP-05/D-01, o teste natural é sobre os tokens: afirmar que os tokens de fundo do tema
  claro têm croma 0 (nenhum componente de cor), de modo que ninguém reintroduza o tom quente sem
  o teste reclamar.
- UXP-03 pede um teste de não-regressão sobre o cálculo de capital imobilizado / potencial de
  receita com dados mock.

</specifics>

<deferred>
## Deferred Ideas

- Paleta oficial da BFX (demanda 5) — **bloqueada**: depende dos hex que o cliente deve fornecer.
- Efeitos e melhorias gerais de UX/UI mencionados de passagem na demanda 5 — escopo aberto demais
  para entrar sem um pedido específico.
- BUG-01 (decremento de estoque por nome, atingindo homônimos) — registrado no backlog.
- Overhaul do dark mode — não é o que o cliente relatou.

</deferred>
