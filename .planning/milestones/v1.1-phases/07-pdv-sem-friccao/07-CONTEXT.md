# Phase 7: PDV sem fricção - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — defaults sensatos, decisões do André já fixadas no PROJECT.md

<domain>
## Phase Boundary

Vendedor completa uma venda do início ao fim sem sair da tela do PDV: custo editável sem bloqueio
de servidor, cliente e fornecedor cadastráveis inline.

Cobre as demandas 7, 8 e 10 do cliente. A demanda 7 ("não consigo editar o custo") estava
**mal diagnosticada**: o campo já é editável no formulário (`produto-item-form.tsx:274` tem
`value` + `onChange`). O que recusa a venda é a validação de servidor.

</domain>

<decisions>
## Implementation Decisions

- **D-01 — PDV-14 remove o piso de custo, mantendo a checagem de subtotal.**
  `src/lib/venda-item-validation.ts` faz duas coisas: (1) confere que `subtotal ≈ valorVenda ×
  quantidade` e (2) recusa `custoProduto < custoPadrao`. **Apenas a regra 2 sai.** A regra 1 é
  proteção diferente (venda gravada com subtotal dissociado de preço/quantidade) e continua.

- **D-02 — Os testes existentes travam o comportamento oposto e precisam ser invertidos.**
  `src/__tests__/venda-item-validation.test.ts:54` tem
  `it("rejeita custoProduto informado abaixo do custo cadastrado no catalogo (fraude de comissao)")`.
  Esse teste passa a afirmar o contrário: custo abaixo do catálogo **é aceito**. Os casos de
  subtotal, tolerância de arredondamento e preço de venda livre permanecem intactos. Renomear o
  caso para refletir a decisão de negócio, não apagá-lo — o histórico da regra deve ficar legível.

- **D-03 — Liberado para TODOS os vendedores, não só admin.** Decisão do André em 2026-08-03,
  contra a recomendação do Grok (que sugeria liberar só para admin). Reabre o vetor de
  comissão/margem inflados fechado no commit `a63dc04`. Está marcado `⚠️ Revisit` no PROJECT.md.
  **Nenhuma mitigação compensatória entra nesta fase** (sem auditoria de alteração de custo, sem
  alerta) — não foi pedida, e adicioná-la seria expandir escopo.

- **D-04 — PDV-15 precisa de uma rota nova.** Não existe `POST /api/clientes` (só
  `GET /api/clientes/similar`, `GET /api/clientes/[id]/...`). O padrão a imitar é
  `cadastrar-produto-rapido-dialog.tsx`, que faz `fetch("/api/produtos", { method: "POST" })`.
  Campos mínimos do modal: **nome** (obrigatório), telefone, empresa parceira. CPF opcional
  (necessário só para boleto). Endereço fora de escopo.

- **D-05 — O modal de cliente avisa de nome parecido antes de criar.** `GET /api/clientes/similar`
  já existe (entregue na quick task 17). `Cliente.nome` é `@unique` — criar um nome repetido
  estoura no banco. O modal consulta o similar e mostra o aviso, sem bloquear.

- **D-06 — PDV-16 precisa de `POST /api/fornecedores`, que também não existe.** E precisa
  respeitar o soft-delete da Fase 6: se o nome já existir **soft-deletado**, reativar em vez de
  inserir (mesma regra D-03 da Fase 6). Sem isso, o unique de `nome` estoura com erro
  incompreensível para o vendedor.

- **D-07 — Ambos os cadastros já deixam o registro selecionado.** Criar e obrigar o vendedor a
  procurar de novo mantém a fricção que a fase existe para remover. O `onCriado` do
  `cadastrar-produto-rapido-dialog.tsx` é o padrão de callback a seguir.

</decisions>

<code_context>
## Existing Code Insights

- `src/lib/venda-item-validation.ts` — módulo puro, sem imports; o alvo do PDV-14. Chamado em
  `src/app/(app)/venda-rapida/actions.ts:205` (dentro de `criarVendaV2`).
- `src/__tests__/venda-item-validation.test.ts` — 8 casos; os de custo abaixo do catálogo mudam
  de sentido. É o padrão de teste de referência do projeto (factory `item()` + assertions diretas).
- `src/components/cadastrar-produto-rapido-dialog.tsx` — o padrão de modal a imitar: `Dialog` do
  shadcn, estado local, `fetch` para uma rota de API, callback `onCriado` que devolve o registro
  criado para o formulário pai já selecionar.
- `src/components/venda-rapida-form-v2.tsx` — o PDV. Já tem autocomplete de cliente
  (`selectedCliente`, linha ~229) e recebe `fornecedores` por prop (linha 78), repassando ao
  `produto-item-form` (linha 889).
- `src/app/(app)/venda-rapida/page.tsx:22` — carrega `fornecedores` no server component; depois da
  Fase 6 essa leitura terá o filtro `deletedAt: null`.
- `src/lib/guards.ts` — `requireAdminOrThrow()`. **Não usar** para o custo (D-03 libera para
  todos), mas as rotas POST novas precisam pelo menos exigir sessão autenticada.
- `normalizeUppercase()` nos cadastros — nome de cliente e fornecedor são gravados em caixa alta.

</code_context>

<specifics>
## Specific Ideas

- O teste que prova PDV-14 é barato e direto: `validarItensContraCatalogo` com
  `custoProduto: 50` e `custoPadrao: 700` deve devolver `null` (aceito). É um módulo puro, então
  roda localmente via `node --input-type=module` mesmo sem vitest.
- As duas rotas POST novas devem devolver o registro criado (id + nome) no corpo, para o modal
  poder selecionar sem uma segunda requisição.
- Cuidado com `Cliente.nome @unique` e `Fornecedor.nome @unique`: as duas rotas precisam tratar o
  conflito com mensagem legível em vez de deixar vazar o erro do Prisma (`P2002`).

</specifics>

<deferred>
## Deferred Ideas

- Mitigação do risco de comissão inflada (auditoria de alteração de custo, alerta ao admin) —
  não pedida; o item está `⚠️ Revisit` no PROJECT.md se o André mudar de ideia.
- Desconto % por item (PDV-05/06) — backlog.
- Endereço do cliente no modal (necessário para entrega Uber) — a Fase 9 trata Uber, e a cotação
  hoje já usa endereço próprio; fora de escopo aqui.

</deferred>
