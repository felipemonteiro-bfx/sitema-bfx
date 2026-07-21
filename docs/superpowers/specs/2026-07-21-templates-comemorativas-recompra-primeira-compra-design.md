# Novos gatilhos de WhatsApp: recompra, primeira compra e datas comemorativas

Data: 2026-07-21

## Objetivo

Expandir os toques automáticos de WhatsApp do BFX com três novos gatilhos, todos
passando pela camada `enviarWhatsApp` (registro em `WhatsAppMensagem`, janela de
24h, cota da Meta) já existente:

1. **Recompra** — empurrão para clientes que compraram há 30–59 dias e não
   voltaram, antes de virarem "inativos".
2. **Primeira compra** — mensagem especial no dia seguinte à primeira compra do
   cliente, no lugar do agradecimento genérico.
3. **Datas comemorativas** — mensagem em 6 datas fixas do calendário, só para
   clientes ativos, respeitando o teto de mensagens da Meta.

Tudo entra **dormente** (flags default 0); nada dispara até o admin ligar.

## Estado atual (contexto)

Os crons existentes seguem um padrão consistente:
- Autenticação por `Bearer CRON_SECRET`.
- Leem flags via `getWhatsAppFlags()` (`src/lib/whatsapp.ts`); saem cedo se a flag
  da automação estiver desligada.
- Enviam via `enviarWhatsApp({ telefone, clienteId, origem: "cron", template })`.
- Deduplicam via `WhatsAppEnvioLog` (`tipo`, opcional `referencia = vendaId`).
- Agendados por Kubernetes CronJobs em `deploy/bfx/cronjobs-app.yaml`.

Referências diretas:
- `reativacao-inativos/route.ts` — `groupBy` da última compra por cliente, filtro
  por limite de dias, exclusão de quem recebeu recentemente, envio, log.
- `agradecimento-pos-venda/route.ts` — vendas de 1 dia atrás, dedup por
  `tipo="agradecimento", referencia=vendaId`.
- `campanha-service.ts` — `verificarCota(alvo)` devolve `{ cabe, disponivel, usados }`
  com `disponivel = max(0, LIMITE_TIER_24H − RESERVA_TRANSACIONAL − usados)`.

## Decisões de escopo

| Decisão | Escolha |
|---|---|
| Recompra: gatilho | Cron; faixa 30–59 dias desde a última compra |
| Primeira compra: gatilho | Cron no dia seguinte; **suprime o agradecimento genérico** dessa venda |
| Comemorativas: público | Só clientes ativos (compraram nos últimos N meses) |
| Comemorativas: datas | 6 fixas de alto valor (ver abaixo) |
| Comemorativas: templates | 6 dedicados (um por data) |
| Comemorativas: cota | Respeita `verificarCota`; envia o que cabe, loga o excedente |

### Fora de escopo

- Datas móveis (Dia das Mães, Dia dos Pais, Black Friday) e Páscoa (Computus).
- Aniversário da loja (data configurável).
- Recompra por ciclo de produto (exigiria dado de ciclo por produto, inexistente).
- Espalhar comemorativas em lotes por vários dias (o público "só ativos" mantém o
  volume sob controle; se exceder a cota, o excedente é logado, não espalhado).

## As 6 datas comemorativas (fixas)

| slug | dia/mês | ocasião | template |
|---|---|---|---|
| `natal` | 25/12 | Feliz Natal | `bfx_natal` |
| `ano_novo` | 01/01 | Feliz Ano Novo | `bfx_ano_novo` |
| `dia_cliente` | 15/09 | Dia do Cliente | `bfx_dia_cliente` |
| `dia_criancas` | 12/10 | Dia das Crianças | `bfx_dia_criancas` |
| `dia_namorados` | 12/06 | Dia dos Namorados | `bfx_dia_namorados` |
| `dia_mulheres` | 08/03 | Dia das Mulheres | `bfx_dia_mulheres` |

## Modelo de dados

### Novas flags em `Config` (migration)

| Campo | Tipo | Default | Uso |
|---|---|---|---|
| `whatsappAutoRecompra` | Int? | 0 | liga o cron de recompra |
| `whatsappDiasRecompra` | Int? | 30 | início da faixa de recompra (fim = `whatsappDiasInativo`) |
| `whatsappAutoPrimeiraCompra` | Int? | 0 | liga o cron de primeira compra |
| `whatsappAutoComemorativas` | Int? | 0 | liga o cron de datas comemorativas |
| `whatsappMesesAtivoComemorativa` | Int? | 6 | janela de "cliente ativo" para comemorativas |

`WhatsAppEnvioLog` **não muda de forma**; ganha novos valores de `tipo`:
`recompra`, `primeira_compra`, e `comemorativa_<slug>` (ex.: `comemorativa_natal`).

### Novos templates no registry (`whatsapp-templates.ts`)

`recompra: "bfx_recompra"`, `primeiraCompra: "bfx_primeira_compra"`,
`natal: "bfx_natal"`, `anoNovo: "bfx_ano_novo"`, `diaCliente: "bfx_dia_cliente"`,
`diaCriancas: "bfx_dia_criancas"`, `diaNamorados: "bfx_dia_namorados"`,
`diaMulheres: "bfx_dia_mulheres"`.

## Componentes

### `src/lib/datas-comemorativas.ts`

```
export type DataComemorativa = { slug: string; dia: number; mes: number; ocasiao: string; template: string };
export const DATAS_COMEMORATIVAS: DataComemorativa[]  // as 6 acima
export function dataComemorativaDeHoje(hoje: Date): DataComemorativa | null
```

`dataComemorativaDeHoje` compara `getDate()`/`getMonth()+1` com a tabela; devolve a
data casada ou `null`. Testável sem relógio real (recebe `hoje` por parâmetro).

### `src/lib/primeira-compra.ts`

```
export async function ehPrimeiraCompra(clienteId: number, vendaId: number): Promise<boolean>
```

Devolve `true` se não existe nenhuma venda do cliente com `id < vendaId` (nem
`dataVenda` anterior). Usado pelo cron de primeira compra (para incluir) e pelo
agradecimento (para excluir) — garante partição sem sobreposição das vendas de
ontem.

### Cron `recompra` (`src/app/api/cron/recompra/route.ts`)

Espelha `reativacao-inativos`:
- `groupBy` clienteId `_max: dataVenda`.
- Seleciona clientes cuja última compra está na faixa `[hoje − diasInativo, hoje − diasRecompra)` — isto é, entre `diasRecompra` (30) e `diasInativo` (60) dias atrás. **A faixa exclui os 60+**, que ficam para o reativacao.
- Exclui quem tem `WhatsAppEnvioLog` tipo `recompra` dentro de um cooldown
  (`diasInativo − diasRecompra` dias, para receber no máximo uma vez enquanto está
  na faixa).
- Envia com `TEMPLATES.recompra`; loga `tipo="recompra"`.
- Flag: `whatsappAutoRecompra`.

### Cron `primeira-compra` (`src/app/api/cron/primeira-compra/route.ts`)

Espelha `agradecimento-pos-venda`:
- Vendas de 1 dia atrás com cliente e telefone.
- Filtra por `ehPrimeiraCompra(clienteId, vendaId)`.
- Dedup por `tipo="primeira_compra", referencia=vendaId`.
- Envia com `TEMPLATES.primeiraCompra`.
- Flag: `whatsappAutoPrimeiraCompra`.

### Alteração no `agradecimento-pos-venda`

Após montar `vendasPendentes`, excluir as que são primeira compra
(`ehPrimeiraCompra`), para que o cliente de primeira viagem receba só a mensagem
de primeira compra. Se `whatsappAutoPrimeiraCompra` estiver **desligada**, o
agradecimento **não** exclui (senão o primeiro comprador não receberia nada) —
a exclusão só vale quando a primeira compra está ativa para assumir esses casos.

### Cron `datas-comemorativas` (`src/app/api/cron/datas-comemorativas/route.ts`)

- Flag `whatsappAutoComemorativas`; sai cedo se desligada.
- `const data = dataComemorativaDeHoje(new Date())`; se `null`, retorna `{ ok:true, semData:true }`.
- Público: clientes com telefone cuja última compra é ≥ `hoje − mesesAtivoComemorativa` meses (reusa `groupBy` da última compra).
- Dedup: exclui quem já tem `WhatsAppEnvioLog` tipo `comemorativa_<slug>` com
  `dataEnvio` ≥ início do dia de hoje (evita reenvio no mesmo dia/ano).
- **Cota**: `const cota = await verificarCota(alvo.length)`; envia no máximo
  `cota.disponivel` clientes; loga em `console`/resposta quantos ficaram de fora
  (`excedente = alvo.length − enviados`). Sem truncar em silêncio.
- Envia com o `data.template`; loga `tipo="comemorativa_<slug>"`.

### `getWhatsAppFlags` (`whatsapp.ts`)

Adicionar ao retorno: `autoRecompra`, `diasRecompra`, `autoPrimeiraCompra`,
`autoComemorativas`, `mesesAtivoComemorativa`, com os mesmos padrões do schema.

### `deploy/bfx/cronjobs-app.yaml`

3 novos CronJobs (curl + `CRON_SECRET`), espelhando os existentes. Horários são
ajustados no deploy; sugestão: recompra e primeira-compra diários de manhã,
comemorativas diário de manhã (o cron decide sozinho se hoje é data).

## Tratamento de erros

Cada cron segue o padrão existente: try/catch, resposta 500 só em erro inesperado
(o CronJob reexecuta), envios individuais que falham entram em `erros[]` sem
abortar o lote. `enviarWhatsApp` já não lança (retorna boolean) e registra falha
na `WhatsAppMensagem`.

## Testes (Vitest, TDD — teste antes da implementação)

- `dataComemorativaDeHoje`: acerta cada uma das 6 datas; devolve `null` em data
  qualquer; não confunde dia/mês (ex.: 12/06 vs 06/12).
- `ehPrimeiraCompra`: `true` sem venda anterior; `false` com venda anterior.
- Recompra: cliente com última compra a 45 dias entra; a 20 dias não; a 70 dias
  não (fica para reativacao). Respeita o cooldown de dedup.
- Partição: uma venda de primeira compra vai só para o cron de primeira compra e é
  excluída do agradecimento (quando a flag está ligada).
- Comemorativas: com público acima do disponível, envia só `cota.disponivel` e
  reporta o excedente; dedup impede reenvio no mesmo dia.

Todos com `prisma`/`fetch` mockados, sem rede/banco real, seguindo os testes de
cron/serviço existentes.

## Aprovação na Meta (pré-requisito operacional)

8 templates novos a aprovar antes de ligar as flags correspondentes:
`bfx_recompra`, `bfx_primeira_compra`, `bfx_natal`, `bfx_ano_novo`,
`bfx_dia_cliente`, `bfx_dia_criancas`, `bfx_dia_namorados`, `bfx_dia_mulheres`.
Os nomes devem bater exatamente com o registry. As comemorativas são categoria
marketing; as duas transacionais, utilitárias.
