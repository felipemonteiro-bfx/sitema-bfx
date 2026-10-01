# Fase 3 — Confirmação do RH, lote por parcela e valores do lote — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar o envio de cada parcela ao RH e a confirmação/recusa manual pela BFX; só parcela confirmada entra na fila da Prudent; o lote passa a ser montado por parcela (3 de 4) e a guardar taxa, líquido solicitado, aprovado, depositado e datas.

**Architecture:** Campos novos em `ParcelaVencimento` e `AnticipacaoBatch` (migração aditiva + backfill "legado"). Regra pura em `src/lib/confirmacao-rh.ts`. O gate entra no único ponto que já decide "parcela livre para lote" (`whereParcelasLivres` em `lote-antecipacao-db.ts`) e no cálculo da fila (`titulosDeVenda` ganha o flag `bloqueadaRh`). A fila continua selecionando vendas + período, e ganha **exclusão de parcelas** (`excluirParcelaIds`), convertida em `parcelaIds` no servidor — o CSV enviado à Prudent usa a mesma exclusão.

**Tech Stack:** Next.js 15 server actions, Prisma, vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md` §3.2 (campos de confirmação), §3.3, §4.1, §4.2.

## Global Constraints

- Mesmas da Fase 1 (worktree, `DATABASE_URL` fictícia nos testes, 8 falhas de env de linha de base, `requireAdminOrThrow()` na primeira linha de toda action que grava, commits por caminho explícito com os dois trailers, sem push, travas de design, hook proíbe `RegExp` + `.exec(`).
- `paga`, `antecipada` e o flag `venda.antecipada` mantêm a semântica atual. `concluirLote` continua gravando `antecipada = true` e `paga = true`, origem `prudent`.
- `registrarLoteConcluido` (antecipação já feita fora do sistema) **não** passa pelo gate de confirmação.
- A fórmula da Prudent vem de `calcularAntecipacao`/`titulosDeVenda` (`src/lib/antecipacao.ts`) — não reescrever.
- Visual: artboard "Prudent — Aguardando RH e lote por parcela" do artifact https://claude.ai/artifact/3zL1PK6awXfKA1pjpoxX4x (arquivo local `/private/tmp/claude-501/-Users-andrebrumcortezferreira-Documents-BFX-sitema-bfx/ceecb562-b893-48e9-bfaf-875587772480/scratchpad/canvas-fechamento/project/AguardandoRH.dc.html`). Componentes shadcn + tokens; depois da UI, `impeccable` polish e `impeccable detect --json` uma vez (ignorar "overused-font").

## Review Focus

1. O consolidado semanal é acumulado do mês: a mesma venda sai em várias sextas — `enviadaRhEm` guarda a **primeira** data (`where: { enviadaRhEm: null }`).
2. Parcela recusada que já está em lote/antecipada → recusa é negada com mensagem ("já está na Prudent").
3. Seleção de vendas cujas parcelas elegíveis foram todas excluídas → `abrirLote` devolve `null` e a UI avisa "nenhuma parcela selecionada" (hoje o `null` é ignorado em silêncio — `prudent/page.tsx:25-45`).
4. CSV da Prudent e lote gravado têm exatamente as mesmas parcelas quando há exclusão (mesma função resolve os ids para os dois).
5. Edição da venda (`historico/actions.ts` apaga e recria parcelas) preserva `enviadaRhEm` e os campos de confirmação por `numeroParcela`.

---

### Task 1: Schema, migração e backfill

**Files:** `prisma/schema.prisma`; Create `prisma/migrations/20260930130000_confirmacao_rh_e_lote/migration.sql`.

- [ ] `ParcelaVencimento` += `enviadaRhEm DateTime? @map("enviada_rh_em")`, `confirmacaoRh String? @map("confirmacao_rh")`, `confirmacaoOrigem String? @map("confirmacao_origem")`, `confirmacaoEm DateTime? @map("confirmacao_em")`, `confirmacaoPor String? @map("confirmacao_por")`, `confirmacaoMotivo String? @map("confirmacao_motivo")`, `@@index([confirmacaoRh])`.
- [ ] `AnticipacaoBatch` += `empresaParceiraId Int? @map("empresa_parceira_id")`, `taxaMensal Float? @map("taxa_mensal")`, `valorLiquidoSolicitado Float? @map("valor_liquido_solicitado")`, `valorAprovado Float? @map("valor_aprovado")`, `valorDepositado Float? @map("valor_depositado")`, `dataDepositoPrevista DateTime? @map("data_deposito_prevista")`, `dataDeposito DateTime? @map("data_deposito")`, `comprovanteKey String? @map("comprovante_key")`. (Sem FK para empresa — lote antigo não tem.)
- [ ] SQL: `ALTER TABLE` com as colunas; índice; backfill:
  ```sql
  -- Toda parcela que já existe entra como confirmada de origem "legado": sem isso a fila da
  -- Prudent fica vazia no dia do deploy. A tela mostra "legado — sem confirmação do RH".
  UPDATE parcelas_vencimento SET confirmacao_rh = 'confirmada', confirmacao_origem = 'legado', confirmacao_em = now()
  WHERE confirmacao_rh IS NULL;
  INSERT INTO audit_logs (acao, detalhes, data) ... -- conferir as colunas reais de audit_logs no schema e copiar o formato da migração 20260923160000_conciliacao_vendas_ate_agosto
  ```
- [ ] Testar em Postgres 16 local (porta 55432) aplicando todas as migrações em ordem, com uma parcela inserida antes da nova para provar o backfill; `npx prisma migrate diff` sem diferença; remover o container.
- [ ] `npx prisma generate`. Commit `feat(prudent): campos de confirmacao do RH e valores do lote`.

### Task 2: Regra pura da confirmação

**Files:** Create `src/lib/confirmacao-rh.ts`; Test `src/__tests__/confirmacao-rh.test.ts`.

**Produces:**
```ts
export const CONFIRMACAO = { confirmada: "confirmada", recusada: "recusada" } as const;
export type EstadoConfirmacao = "aguardando" | "confirmada" | "legado" | "recusada";
export function estadoConfirmacao(p: { confirmacaoRh: string | null; confirmacaoOrigem: string | null }): EstadoConfirmacao;
export function rotuloConfirmacao(p: { confirmacaoRh: string | null; confirmacaoOrigem: string | null; confirmacaoMotivo?: string | null }): string;
  // "Aguardando RH" | "Confirmada pelo RH" | "Legado — sem confirmação do RH" | "Recusada: <motivo>"
export function podeConfirmar(p: { confirmacaoRh: string | null }): boolean; // aguardando ou recusada
export function podeRecusar(p: { confirmacaoRh: string | null; antecipada: boolean; antecipacaoLoteId: number | null }): { ok: true } | { ok: false; erro: string };
  // já antecipada ou em lote → { ok:false, erro:"A parcela já está na Prudent; cancele o lote antes." }
export function validarMotivo(motivo: unknown): { ok: true; valor: string } | { ok: false; erro: string }; // trim, ≥ 5 caracteres
```
- [ ] Testes para cada função (tabela de casos), inclusive `validarMotivo("  ok ")` → erro "Informe o motivo da recusa (mínimo 5 caracteres)."
- [ ] Commit `feat(prudent): regra de confirmacao do RH`.

### Task 3: Consolidado semanal grava `enviadaRhEm`

**Files:** Modify `src/app/api/cron/relatorio-semanal/route.ts` (logo após o `await sendWeeklyReport(...)` com sucesso, ~l.66); Test: `src/__tests__/relatorio-semanal-route.test.ts` (adicionar `parcelaVencimento: { updateMany: vi.fn() }` ao mock).
- [ ] Teste: depois de envio bem-sucedido, `parcelaVencimento.updateMany` é chamado com `{ where: { vendaId: { in: [ids das vendas] }, enviadaRhEm: null }, data: { enviadaRhEm: <Date> } }`; se `sendWeeklyReport` lança, não é chamado.
- [ ] Implementar; commit `feat(relatorio-semanal): marca parcelas enviadas ao RH`.

### Task 4: Actions de confirmação e recusa

**Files:** Create `src/app/(app)/prudent/confirmacao-actions.ts`; Test `src/__tests__/confirmacao-actions.test.ts` (mock `@/lib/db`, `@/lib/guards`, `@/lib/audit`, `next/cache`).

**Produces:**
```ts
export async function confirmarParcelasRh(ids: number[]): Promise<{ ok: true; confirmadas: number } | { ok: false; erro: string }>;
export async function recusarParcelasRh(ids: number[], motivo: string): Promise<{ ok: true; recusadas: number } | { ok: false; erro: string }>;
```
- [ ] Primeira linha `const sessao = await requireAdminOrThrow();`. `idsValidos` (já existe em `@/lib/ids-validos`) e limite de 1000.
- [ ] Confirmar: `updateMany({ where: { id: { in }, OR: [{ confirmacaoRh: null }, { confirmacaoRh: "recusada" }] }, data: { confirmacaoRh: "confirmada", confirmacaoOrigem: "rh", confirmacaoEm: new Date(), confirmacaoPor: sessao.nomeExibicao ?? sessao.username ?? null, confirmacaoMotivo: null } })`.
- [ ] Recusar: `validarMotivo`; carregar as parcelas; se alguma falha em `podeRecusar`, devolver o erro sem gravar nada; senão `updateMany` com `confirmacaoRh: "recusada"`, `confirmacaoOrigem: "rh"`, motivo, usuário e data.
- [ ] `createAuditLog("prudent:confirmacao-rh", { acao, ids, motivo? })`; `revalidatePath("/prudent")`.
- [ ] Testes: guarda primeiro (se lança, nada grava); confirmar conta só as elegíveis; recusar com motivo curto → erro; recusar parcela em lote → erro e zero escrita; auditoria chamada.
- [ ] Commit `feat(prudent): confirmar e recusar titulos pelo RH`.

### Task 5: Gate na fila e lote por parcela

**Files:** Modify `src/lib/antecipacao.ts` (`ParcelaParaAntecipacao` ganha `bloqueadaRh?: boolean`; `titulosDeVenda` filtra `!p.bloqueadaRh`), `src/lib/lote-antecipacao-db.ts`, `src/app/(app)/prudent/page.tsx` (select traz `confirmacaoRh`, mapeia `bloqueadaRh: p.confirmacaoRh !== "confirmada"`), `src/app/(app)/prudent/actions.ts` (`calcularSelecaoAction` aceita `excluirParcelaIds?: number[]`), rota do CSV `src/app/api/relatorios/antecipacao/route.ts` (aceita `excluir=1,2,3` e usa a mesma resolução), `src/components/antecipacao-client.tsx`. Tests: `src/__tests__/lote-antecipacao.test.ts` (estender), `src/__tests__/antecipacao-em-andamento.test.ts` (estender), novo `src/__tests__/lote-por-parcela.test.ts`.

**Produces (lote-antecipacao-db.ts):**
```ts
export async function resolverParcelasDoLote(tx: Tx, entrada: { vendaIds: number[]; periodo: PeriodoLote | null; excluirParcelaIds: number[] }): Promise<{ id: number; vendaId: number; valorParcela: number; dataVencimento: Date }[]>;
export async function abrirLote(entrada: { vendaIds: number[]; periodo: PeriodoLote | null; excluirParcelaIds?: number[] }): Promise<ResultadoLote | null>;
```
- [ ] `whereParcelasLivres` ganha `confirmacaoRh: "confirmada"` e `id: { notIn: excluirParcelaIds }` quando houver exclusão. `registrarLoteConcluido` usa uma variante **sem** o filtro de confirmação (parâmetro `exigirConfirmacao: boolean`).
- [ ] `abrirLote` grava no lote: `empresaParceiraId` (de `cliente.empresaParceiraId` das vendas — ler junto com `validarUmaEmpresa`; nulo se não houver), `taxaMensal: TAXA_MENSAL_PADRAO`, `valorLiquidoSolicitado` = `calcularAntecipacao(titulos).valorLiquido` onde `titulos` = para cada venda, `titulosDeVenda({ dataVenda, valorVenda, parcelas, parcelas_detalhes: parcelas escolhidas daquela venda })` concatenados; `dataDepositoPrevista` = hoje (UTC, data pura) + 2 dias.
- [ ] Testes: parcela `confirmacaoRh: null` não entra (verificar o `where` passado ao `findMany`); exclusão chega ao `where`; valores gravados no `create`; `registrarLoteConcluido` não exige confirmação; `titulosDeVenda` ignora `bloqueadaRh`.
- [ ] UI (`antecipacao-client.tsx`): cada venda da fila pode expandir e mostrar suas parcelas elegíveis como caixas marcáveis (artboard); desmarcar acrescenta o id a `excluirParcelaIds` (estado local, enviado no FormData como `excluir` e na URL do CSV como `excluir=`); o resumo (bruto, taxa, líquido) vem de `calcularSelecaoAction` com a exclusão; o botão diz "Enviar N parcelas à Prudent". Parcelas com `bloqueadaRh` aparecem desabilitadas com "Aguardando RH". Quando `abrirLote` devolve `null`, `antecipar` (page.tsx) passa a devolver erro e a UI mostra "Nenhuma parcela confirmada na seleção."
- [ ] Commit `feat(prudent): lote por parcela e gate de confirmacao do RH`.

### Task 6: Conclusão do lote com os valores

**Files:** Modify `src/lib/lote-antecipacao-db.ts` (`concluirLote`), `src/app/(app)/prudent/actions.ts` (`concluirLoteAction`), `src/components/historico-antecipacoes.tsx` (dialog ~l.390-416); Test: estender `src/__tests__/lote-antecipacao.test.ts`.

- [ ] `concluirLote({ loteId, dataRetorno, usuario, valorAprovado?, valorDepositado?, dataDeposito? })`: grava os três campos no mesmo `fecharLote` (valores numéricos ≥ 0 com 2 casas; `dataDeposito` via `dataPuraOuNula`, default = `dataRetorno`). Nada mais muda.
- [ ] Action valida (número finito, não negativo) e repassa. Dialog: campos "Valor aprovado pela Prudent", "Depósito recebido" (`CurrencyInput` existente — atenção ao bug de round-trip descrito na memória: passar número, não `String(numero)`), "Data do depósito" (`DateInput`), com o líquido solicitado do lote exibido como referência. Os dois valores são opcionais, mas o dialog avisa quando `valorDepositado` difere do `valorLiquidoSolicitado` em mais de R$ 1,00.
- [ ] Testes: valores chegam ao `updateMany` do lote; valor negativo → erro; sem valores continua funcionando (compatível).
- [ ] Commit `feat(prudent): conclusao do lote registra aprovado e deposito`.

### Task 7: Aba "Aguardando RH"

**Files:** Create `src/components/aguardando-rh-client.tsx`; Modify `src/app/(app)/prudent/page.tsx` (consulta das parcelas `confirmacaoRh: null` de vendas `WHERE_VENDA_ANTECIPAVEL`, com cliente/matrícula/empresa e `enviadaRhEm`, agrupadas por empresa e data de envio; a aba entra antes da fila, com contador).
- [ ] Seguir o artboard: cabeçalho por empresa ("Consolidado enviado ao RH em DD/MM · N títulos · valor"; sem envio → "Ainda não enviado ao RH"), tabela com seleção (Título `V{vendaId}-{n}/{total}`, Colaborador, Matrícula, Vencimento, Valor), barra de ação da seleção com "Recusar…" (abre `AlertDialog` com `Textarea` do motivo) e "Confirmar pelo RH". Estado vazio: "Nenhum título esperando o RH." Erros das actions em `toast` (padrão do projeto — conferir o que `historico-antecipacoes.tsx` usa).
- [ ] Na fila, parcela de origem legado mostra etiqueta discreta "legado".
- [ ] Travas de design, `impeccable` polish + detect. Commit `feat(prudent): aba aguardando RH`.

### Task 8: Edição de venda preserva os campos novos

**Files:** Modify `src/app/(app)/historico/actions.ts` (select das parcelas existentes ~l.200 e `pagasMap` ~l.219 incluem `enviadaRhEm`, `confirmacaoRh`, `confirmacaoOrigem`, `confirmacaoEm`, `confirmacaoPor`, `confirmacaoMotivo`; os `createMany` das l.439 e l.478 copiam esses campos da parcela de mesmo número; parcela nova, sem par, nasce `null` = aguardando); Test: estender `src/__tests__/historico-edicao-preserva-antecipada.test.ts`.
- [ ] Teste: editar a venda sem mudar parcelas mantém confirmação e `enviadaRhEm`; parcela acrescentada nasce aguardando.
- [ ] Commit `fix(historico): edicao preserva envio e confirmacao do RH`.

### Task 9: Verificação

- [ ] Suíte inteira; `tsc` sem erro novo nos arquivos da fase; travas de design; `npx eslint` nos arquivos tocados.
