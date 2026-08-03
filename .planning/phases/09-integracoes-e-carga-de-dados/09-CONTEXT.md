# Phase 9: Integrações e carga de dados - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous)

<domain>
## Phase Boundary

A cotação de frete Uber deixa de falhar em silêncio e fica pronta para funcionar assim que a
credencial existir; e a carga de clientes da Equilibrium ganha um importador seguro (dry-run) e
idempotente.

Cobre as demandas 3 e 2 do cliente. **Esta é a fase com mais dependência externa do milestone** —
duas das três entregas dependem de coisas que ninguém no time controla.

</domain>

<decisions>
## Implementation Decisions

- **D-01 — INT-01 está bloqueado por credencial, não por código.** Verificado em 2026-08-03: o
  Secret `bfx-app-secrets` no cluster tem 17 chaves e **nenhuma `UBER_*`**. O código de cotação já
  existe (`src/lib/uber.ts`, `src/app/api/frete/uber/quote/route.ts` e `.../status/route.ts`) e a
  UI do PDV já o consome. As envs esperadas são `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_TOKEN` e
  `UBER_PICKUP_ADDRESS_JSON`. A cotação nunca funcionou em produção porque a credencial nunca foi
  criada. **A fase entrega o runbook e a prontidão; criar os valores no SSM é ação do André.**

- **D-02 — INT-02 é o trabalho real de código desta fase.** Hoje `getDeliveryQuote()` devolve
  `null` em **todos** os caminhos de erro (`src/lib/uber.ts:114`, `:126`, `:129`): credencial
  ausente, endereço inválido, erro HTTP da Uber e exceção de rede são indistinguíveis para quem
  chama. O vendedor vê o frete simplesmente não preencher, sem saber por quê. A entrega é
  distinguir os casos e dar mensagem clara — sem travar a venda, que deve seguir com frete manual.

- **D-03 — INT-03 entrega o importador, não os dados.** Mesmo desenho já validado no importador de
  fornecedores da Fase 6 (`src/lib/fornecedor-import.ts`): módulo puro de parsing + planejamento,
  `dry-run` que só reporta criados/ignorados/erros, e `commit` idempotente. O arquivo da
  Equilibrium ainda não foi entregue pelo cliente.

- **D-04 — Idempotência do import de clientes é por CPF, com fallback para nome.** `Cliente.nome`
  é `@unique` no schema e `cpf` é opcional. Regra: se houver CPF, ele é a chave; sem CPF,
  a chave é o nome normalizado. Isso evita tanto duplicar quanto estourar o unique de `nome`.

- **D-05 — Vincular o cliente importado à empresa parceira.** `EQUILIBRIUM` **já existe** como
  `EmpresaParceira` no banco de produção (verificado: as 6 empresas são `AMAZON FIVE`,
  `CLIENTE PF BFX SHOP`, `EQUILIBRIUM`, `MIRAX SEGURANÇA`, `SEM EMPRESA`, `SOFT LIVE`). O
  importador aceita a empresa como parâmetro e preenche `empresaParceiraId` — sem isso os clientes
  entram órfãos e o relatório por empresa (que é o fluxo de desconto em folha) não os enxerga.

- **D-06 — Reusar o padrão de importação, não inventar outro.** A Fase 6 já estabeleceu
  `parseCsv*` + `planejar*` + action de dry-run + action de commit + client component. Seguir a
  mesma forma mantém o código previsível e reaproveita os aprendizados (aspas, dedupe dentro do
  próprio arquivo, limite de linhas).

</decisions>

<code_context>
## Existing Code Insights

- `src/lib/uber.ts:13` — `getUberDirectConfig()` devolve `null` se faltar customerId ou token.
- `src/lib/uber.ts:55` — `getDeliveryQuote()`; os `return null` das linhas 114, 126 e 129 são o
  alvo de INT-02.
- `src/app/api/frete/uber/status/route.ts` — já devolve `{ enabled: false }` quando não
  configurado; é o gancho natural para a UI explicar o motivo.
- `src/components/venda-rapida-form-v2.tsx:920` — o botão de cotação
  (`disabled={uberQuoteLoading || !selectedCliente}`); é aqui que a mensagem clara aparece.
- `src/lib/fornecedor-import.ts` (Fase 6) — o padrão de importador a imitar: módulo puro, sem
  imports, com parsing e planejamento separados da escrita.
- `src/app/(app)/importacao/fornecedores/` (Fase 6) — o par action + page + client component.
- `prisma/schema.prisma:11` — `model Cliente`: `nome @unique`, `cpf` opcional, `empresaParceiraId`
  opcional, `estagioCrm` com default `"cliente"`. Para leads importados que ainda não compraram,
  o comentário do schema indica `novo_lead` como estágio adequado.

</code_context>

<specifics>
## Specific Ideas

- INT-02 precisa de um tipo de retorno que distinga os casos em vez de `null` para tudo — por
  exemplo um resultado discriminado (`ok` | `sem_credencial` | `endereco_invalido` | `erro_upstream`).
  A lógica de classificação deve morar em módulo puro para ser verificável sem vitest.
- O teste de INT-01/INT-02 é por mock: `status` com credencial → `enabled: true`; sem credencial →
  `enabled: false` com motivo; quote com HTTP 401 → `erro_upstream` e mensagem legível, nunca
  exceção vazando para a UI.
- INT-03: o teste que importa é o de idempotência — o mesmo CSV rodado duas vezes gera
  criados na primeira e ignorados na segunda, e o dry-run não escreve nada.

</specifics>

<deferred>
## Deferred Ideas

- Criar corrida Uber de verdade (delivery, tracking, conciliação de custo) — fora de escopo do
  milestone; o cliente pediu "puxar custo", que a cotação já resolve.
- A carga efetiva dos dados da Equilibrium — depende do arquivo do cliente.
- Endereço do cliente no cadastro rápido do PDV (melhoraria a cotação) — ficou fora da Fase 7.

</deferred>
