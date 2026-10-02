# Seletor Entrega/Retirada e custo real obrigatório

Data: 2026-10-02 · Branch: `feat/entrega-retirada` · Base: `nextjs-migration`

## Contexto

A PR #37 passou a exigir custo real de envio (`vendas.custo_envio`) quando há frete
cobrado (`valor_frete > 0`). Sobrou a entrega com frete grátis: frete 0, mas houve
custo real. O sistema não tem como saber que houve entrega, o custo some do lucro e
nada bloqueia.

## Objetivo

O operador declara se a venda é entrega ou retirada. Sendo entrega, o custo real de
envio é obrigatório, mesmo com frete 0.

## Decisões já tomadas (André, 02/10)

- Gatilho é um campo explícito, não inferência a partir do frete.
- Escolha obrigatória, **sem valor padrão** na venda nova. Pré-selecionar "Retirada"
  reabriria a brecha por inércia.
- Vendas anteriores ficam sem valor (`null`). Sem backfill.

## Modelo de dados

- Coluna nova `vendas.entrega BOOLEAN NULL` (`Venda.entrega Boolean? @map("entrega")`).
  `true` = entrega, `false` = retirada, `null` = venda anterior à regra.
- Migration somente com `ADD COLUMN`, sem default. Não reescreve a tabela. As migrations
  rodam na subida do container (`migrate deploy`), então vale para as duas instâncias.

## Regras

Função pura `erroEntrega(...)` em `src/lib/validations/venda.ts`, ao lado de
`erroCustoEnvio`. Mensagens em constantes exportadas.

Venda nova (criação):

| entrega | frete | envio | resultado |
|---|---|---|---|
| ausente (`null`/`undefined`) | qualquer | qualquer | erro: escolha Entrega ou Retirada |
| `true` | qualquer | `<= 0` | erro: custo real do envio é obrigatório na entrega |
| `true` | qualquer | `> 0` | ok |
| `false` | `> 0` | qualquer | erro: retirada não pode ter frete cobrado |
| `false` | `0` | qualquer | ok |

Edição:

- Venda com `entrega = null` que não teve frete, envio nem entrega alterados: salva
  sem exigir nada (como na #37).
- Se frete, envio ou entrega mudaram, aplica a regra cheia da tabela. Para vendas que
  seguem `null`, vale só `erroCustoEnvio` (frete > 0 ⇒ envio > 0).
- `erroCustoEnvio` e `erroCustoEnvioNaEdicao` continuam existindo como piso das vendas
  `null` e da action legada.

## Pontos que mudam

1. `prisma/schema.prisma` e migration `20261002xxxxxx_add_venda_entrega`.
2. `vendaV2Schema`: campo `entrega` booleano obrigatório; `superRefine` chama a regra.
3. `criarVendaV2` (`venda-rapida/actions.ts`): lê `entrega` do `FormData` (`"1"`/`"0"`;
   qualquer outro valor ou ausência vira `undefined` e é rejeitado) e grava na coluna.
4. `venda-rapida-form-v2.tsx`: seletor Entrega/Retirada sem pré-seleção, com asterisco,
   erro inline e bloqueio do submit. A cotação Uber aplicada marca Entrega
   automaticamente; o operador pode trocar.
5. Edição do histórico (`historico/actions.ts` e o form de edição): exibe o valor
   gravado, com "Não informado" para `null`; grava `entrega` quando escolhido.
6. Tools do chat (`ai-actions.ts`): `criar_venda` exige `entrega`; `atualizar_venda`
   aceita o campo. A resposta de erro lista a opção faltante.
7. O custo provisório da Uber (`fonteCustoEnvioNaCriacao`) não muda.

## Fora de escopo

- Importação em lote (`/api/importacao/batch`): vendas importadas ficam `null`.
- Backfill de vendas anteriores.
- Relatórios ou filtros por tipo de entrega.
- Action legada `criarVenda`: segue só com `erroCustoEnvio`.

## Riscos e como ficam cobertos

- **Chat sem o campo novo:** `criar_venda` passa a falhar até o modelo informar
  `entrega`. A descrição da tool ganha o campo como obrigatório; teste de adoção.
- **Form antigo em cache no navegador:** posta sem `entrega` e leva a rejeição, que
  entra em `registrarRejeicaoVenda`. Aceitável: o erro mostra a mensagem clara.
- **Edição de venda `null`:** não pode travar. Teste "salvar sem alterar" (round-trip)
  obrigatório, como nas outras telas de edição.
- **Dois bancos:** a migration é aditiva e idempotente por `migrate deploy`; nada a
  rodar à mão.

## Testes (TDD, escritos antes da implementação)

1. `erroEntrega` e a versão de edição: todas as combinações de entrega
   (`true`/`false`/ausente/`null`) × frete × envio × criação/edição.
2. `vendaV2Schema`: rejeita sem `entrega`, aceita entrega com frete 0 e envio > 0.
3. Edição: venda `null` salva sem alterar; mudar frete aplica a regra; trocar para
   Entrega sem envio recusa.
4. Adoção por leitura de fonte: `criarVendaV2` grava `entrega`; form tem o seletor;
   `ai-actions` exige o campo.
5. Migration: SQL contém só `ADD COLUMN "entrega" BOOLEAN`, sem `DEFAULT` nem `NOT NULL`.

## Fluxo de entrega

Spec → plano (`writing-plans`) → TDD → implementação mínima → review com subagente →
commit, push, PR, CI verde, merge e deploy automático.
