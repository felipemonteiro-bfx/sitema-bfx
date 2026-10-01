# Fase 5 — Fechamento por empresa (até "enviado") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela `/fechamento`: gerar, para uma empresa com `cobrancaViaBfx` e uma competência (mês de vencimento), o demonstrativo das parcelas elegíveis, reservando cada parcela para que nenhum outro fluxo a cobre ou baixe; ajustes justificados; conferir (versão congelada com XLSX); enviar ao RH por e-mail. Pix e recebimento ficam na Fase 6.

**Architecture:** Regra pura em `src/lib/fechamento.ts` (competência, elegibilidade com motivo, totais, transições). Gravações em `src/lib/fechamento-db.ts`, sempre em transação, com o status anterior no `where`. A reserva é `ParcelaVencimento.fechamentoId`; os outros fluxos de escrita em parcela passam a recusar parcela reservada. Versão = foto (`FechamentoLinha`) + arquivos em `ArquivoFinanceiro` (criado na Fase 4).

**Tech Stack:** Next.js 16, Prisma 6, pdf-lib, `src/lib/xlsx/pacote-xlsx.ts`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md` §3.2 (reserva e edição), §3.6, §5.1, §5.2, §5.4.

## Global Constraints

- Mesmas das fases anteriores (worktree, testes, `requireAdminOrThrow()` na 1ª linha, commits por caminho com os dois trailers, sem push, travas de design, sem `RegExp` + `.exec(`).
- Só gera fechamento se a regra vigente da empresa no dia 1º da competência tiver `cobrancaViaBfx = true`. Hoje nenhuma tem: a tela precisa funcionar e explicar isso ("Nenhuma empresa com cobrança via BFX ligada. Ligue em Cadastros › Empresas › Regras depois da confirmação da Prudent.").
- **Divergência consciente da spec:** o status `retificacao` não é implementado. Não existe ação que cancele venda (só `deleteVenda`), e esta fase faz `deleteVenda` e a edição de parcelas recusarem parcela reservada em fechamento conferido ou posterior — então o estado nunca seria alcançado. Registrar no relatório.
- O PDF do demonstrativo é gerado no envio (Fase 6 põe o Pix nele); nesta fase, "Enviar" gera PDF + XLSX da versão e manda por e-mail sem bloco de Pix — o bloco entra na Fase 6.
- Visual: artboard "Fechamento por empresa" (`/private/tmp/claude-501/-Users-andrebrumcortezferreira-Documents-BFX-sitema-bfx/ceecb562-b893-48e9-bfaf-875587772480/scratchpad/canvas-fechamento/project/Fechamento.dc.html`). `impeccable` polish + detect depois da UI (ignorar "overused-font").

## Review Focus

1. Duas abas gerando o fechamento da mesma empresa/competência ao mesmo tempo → um fechamento só (unique) e cada parcela reservada uma vez (`fechamentoId: null` no `where` + `count`).
2. Venda editada depois do fechamento em preparação → a reserva sai e a tela mostra "parcelas mudaram — atualizar"; depois de conferido, a edição de parcelas é recusada com a mensagem.
3. `deleteVenda` de venda com parcela em fechamento conferido/enviado ou com boleto Prudent → recusado.
4. Baixa manual (individual e em lote), desfazer baixa e baixa via Asaas numa parcela reservada → recusados/ignorados, sem gravar.
5. Ajuste sem justificativa, ou em fechamento já conferido → recusado.

---

### Task 1: Schema e migração

**Files:** `prisma/schema.prisma`; Create `prisma/migrations/20260930150000_fechamentos/migration.sql` (via `prisma migrate diff`, como na Fase 4).

- [ ] Modelos (`@map` snake_case como o resto):
  - `Fechamento`: `id`, `empresaParceiraId` (FK Restrict), `competencia String` (`"AAAA-MM"`), `status String @default("em_preparacao")`, `responsavel String?`, `versaoAtual Int @default(0)`, `desatualizado Boolean @default(false)`, `criadoEm`, `atualizadoEm @updatedAt`; `@@unique([empresaParceiraId, competencia])`; relações `versoes`, `ajustes`, `parcelas ParcelaVencimento[]`.
  - `FechamentoVersao`: `id`, `fechamentoId` (Cascade), `numero Int`, `totalBruto Float`, `totalAjustes Float`, `totalFinal Float`, `ajustesJson String`, `xlsxArquivoId Int?`, `pdfArquivoId Int?` (relações nomeadas com `ArquivoFinanceiro`, SetNull), `criadaEm`, `criadaPor String?`, `enviadaEm DateTime?`, `enviadaPor String?`; `@@unique([fechamentoId, numero])`; relação `linhas`.
  - `FechamentoLinha`: `id`, `versaoId` (Cascade), `parcelaId Int?` (relação com `ParcelaVencimento`, SetNull — a edição de venda recria parcelas), `vendaId Int`, `numeroParcela Int`, `totalParcelas Int`, `clienteNome String`, `matricula String?`, `valor Float`, `vencimento DateTime`, `loteId Int?`, `antecipada Boolean`, `boletoPrudentId Int?`.
  - `FechamentoAjuste`: `id`, `fechamentoId` (Cascade), `valor Float`, `justificativa String`, `criadoPor String?`, `criadoEm`, `removidoEm DateTime?`.
  - `ParcelaVencimento` += `fechamentoId Int?` (relação `fechamento Fechamento? ... onDelete: SetNull`, `@@index([fechamentoId])`), `liquidadaEm DateTime? @map("liquidada_em")`, relação inversa `linhasFechamento FechamentoLinha[]`.
  - `EmpresaParceira` += `fechamentos Fechamento[]`.
- [ ] Testar em Postgres 16 local com todas as migrações; `migrate diff` vazio; `prisma generate`. Commit `feat(fechamento): tabelas do fechamento mensal`.

### Task 2: Regra pura

**Files:** Create `src/lib/fechamento.ts`; Test `src/__tests__/fechamento.test.ts`.

**Produces:**
```ts
export const STATUS_FECHAMENTO = { emPreparacao: "em_preparacao", conferido: "conferido", enviado: "enviado", pagoParcial: "pago_parcial", pago: "pago" } as const;
export const ROTULO_STATUS_FECHAMENTO: Record<string, string>; // "Em preparação", "Conferido", "Enviado ao RH", "Pago parcialmente", "Pago"
export function competenciaDe(d: Date): string;                       // UTC → "AAAA-MM"
export function intervaloCompetencia(c: string): { inicio: Date; fim: Date }; // [1º dia 00:00Z, 1º dia do mês seguinte) — erro se formato inválido
export function rotuloCompetencia(c: string): string;                  // "outubro de 2026"
export function identificadorParcela(vendaId: number, numero: number, total: number): string; // "V240-3/4"
export type ParcelaParaFechamento = { id: number; vendaStatus: string; liquidadaEm: Date | null; fechamentoId: number | null; confirmacaoRh: string | null; antecipada: boolean; paga: boolean; antecipacaoLoteId: number | null; loteStatus: string | null; boletoDirecionamento: string | null; empresaParceiraId: number | null };
export type MotivoBloqueio = "venda_inativa" | "ja_liquidada" | "em_outro_fechamento" | "recusada_rh" | "boleto_a_empresa" | "paga_por_outra_via" | "lote_em_andamento" | "sem_empresa";
export const ROTULO_MOTIVO: Record<MotivoBloqueio, string>; // "Venda cancelada ou estornada", "Já paga no fechamento", "Em outro fechamento", "Recusada pelo RH", "Boleto Prudent ainda direcionado à empresa", "Paga por outra via", "Lote em andamento na Prudent", "Cliente sem empresa parceira"
export function elegibilidadeFechamento(p: ParcelaParaFechamento, fechamentoId: number | null): { ok: true } | { ok: false; motivo: MotivoBloqueio };
  // ordem de checagem = ordem da tabela da spec §5.1; "boleto_a_empresa" = antecipada && boletoDirecionamento !== "bfx"
export function totaisFechamento(linhas: { valor: number }[], ajustes: { valor: number; removidoEm: Date | null }[]): { totalBruto: number; totalAjustes: number; totalFinal: number }; // centavos
export function validarAjuste(valor: unknown, justificativa: unknown): { ok: true; valor: number; justificativa: string } | { ok: false; erro: string }; // valor ≠ 0 finito; justificativa ≥ 5 chars
export function podeEditar(status: string): boolean;   // só em_preparacao
export function podeReabrir(status: string): boolean;  // conferido | enviado | pago_parcial
```
- [ ] Testes de tabela para cada motivo (um caso por linha) e para totais/ajustes removidos. Commit `feat(fechamento): regras puras`.

### Task 3: Gravações do fechamento

**Files:** Create `src/lib/fechamento-db.ts`; Test `src/__tests__/fechamento-db.test.ts` (prisma mockado com `$transaction(fn => fn(mock))`, padrão de `lote-antecipacao.test.ts`).

**Produces:**
```ts
export async function gerarOuAtualizarFechamento(e: { empresaParceiraId: number; competencia: string; usuario: string | null }): Promise<{ fechamentoId: number; reservadas: number; liberadas: number; bloqueadas: { parcelaId: number; motivo: MotivoBloqueio }[] }>;
  // erro se regra vigente no dia 1º não tem cobrancaViaBfx; cria fechamento se não existe (upsert pela unique); só em em_preparacao;
  // carrega parcelas da empresa (cliente.empresaParceiraId) com vencimento na competência + as já reservadas neste fechamento;
  // libera (fechamentoId = null) as reservadas que deixaram de ser elegíveis; reserva as elegíveis com updateMany where { id in, fechamentoId: null } e confere count; desatualizado = false
export async function adicionarAjuste(e: { fechamentoId: number; valor: number; justificativa: string; usuario: string | null }): Promise<void>; // só em em_preparacao
export async function removerAjuste(e: { ajusteId: number }): Promise<void>; // soft: removidoEm
export async function conferirFechamento(e: { fechamentoId: number; usuario: string | null }): Promise<{ versao: number }>;
  // transação: status em_preparacao no where; revalida elegibilidade de todas as reservadas (alguma falha → erro "Parcelas mudaram desde a geração. Clique em Atualizar parcelas."); zero parcelas → erro;
  // cria FechamentoVersao numero = versaoAtual + 1 com linhas (cliente.nome, cliente.matricula, parcelas totais da venda, loteId, antecipada, boletoPrudentId), totais e ajustesJson; gera XLSX (Task 5) → ArquivoFinanceiro; status conferido; versaoAtual++
export async function reabrirFechamento(e: { fechamentoId: number }): Promise<void>; // podeReabrir; status → em_preparacao
export async function marcarEnviado(e: { fechamentoId: number; versao: number; pdfArquivoId: number; usuario: string | null }): Promise<void>; // conferido → enviado; versao.enviadaEm
```
- [ ] Testes: corrida de reserva (count menor → erro "Outra operação pegou parcelas deste fechamento. Recarregue."); liberação de parcela que ficou inelegível; conferir com parcela mudada → erro; conferir cria versão 1 e depois de reabrir + conferir cria versão 2; ajuste em conferido → erro; empresa sem `cobrancaViaBfx` → erro.
- [ ] Commit `feat(fechamento): gerar, ajustar, conferir e reabrir`.

### Task 4: Reserva vale contra os outros fluxos

**Files:** Modify:
- `src/app/(app)/historico/baixa-actions.ts` — `darBaixaParcela`, `darBaixaParcelas`: `fechamentoId: null` no `where`; `desfazerBaixaParcela`: recusar se `fechamentoId` não nulo ("Parcela no fechamento de <competência>; o recebimento é pelo fechamento.").
- `src/lib/baixa-parcelas-db.ts` + `src/lib/baixa-parcelas.ts` — `ParcelaParaBaixa` ganha `fechamentoId`; `decidirBaixaAsaas` devolve `{ acao: "ignorar", motivo: "reservada_no_fechamento" }` (seguir o formato das decisões existentes) para parcela reservada; `where` da baixa ganha `fechamentoId: null`.
- `src/app/(app)/historico/actions.ts` — `updateVenda`: carregar `fechamentoId` e o status do fechamento das parcelas existentes; se alguma parcela reservada estiver em fechamento com status ≠ `em_preparacao` e a edição mudar quantidade/valor/vencimento de parcelas → recusar ("Parcela V…-n/t está no fechamento de <competência> (<status>). Reabra o fechamento e retire-a antes."); se em `em_preparacao`, não preservar `fechamentoId` (reserva solta) e marcar `desatualizado = true` no fechamento. Preservar `liquidadaEm` e `boletoPrudentId` no `pagasMap`/`createMany` por número de parcela; edição que muda valor/vencimento de parcela com `boletoPrudentId` → recusar ("A Prudent já emitiu boleto desta parcela.").
- `src/app/(app)/historico/actions.ts` — `deleteVenda`: antes de apagar, recusar se alguma parcela tem `boletoPrudentId` ou `fechamentoId` com fechamento ≠ `em_preparacao`; se só em `em_preparacao`, marcar o fechamento `desatualizado`. (Não acrescentar guarda de admin — fora de escopo; relatar.)
- `src/app/(app)/obrigacoes/actions.ts` — `alterarDirecionamento` `bfx → empresa`: recusar se alguma parcela do boleto tem fechamento ≠ `em_preparacao`.
- Tests: estender `baixa-manual.test.ts`, `baixa-asaas*.test.ts`, `historico-edicao-*.test.ts` e criar `src/__tests__/delete-venda-reserva.test.ts`.
- [ ] Commit `feat(fechamento): reserva protege a parcela nos outros fluxos`.

### Task 5: Demonstrativo em XLSX e PDF

**Files:** Create `src/lib/fechamento-xlsx.ts` (`gerarFechamentoXlsx(dados: DemonstrativoDados): Uint8Array` com `Grade`/`empacotarXlsx` de `src/lib/xlsx/pacote-xlsx.ts`), `src/lib/fechamento-pdf.ts` (`gerarFechamentoPdf(dados: DemonstrativoDados & { pix?: { copiaECola: string; qrPng?: Uint8Array } | null; logoPath?: string | null }): Promise<Buffer>` com pdf-lib no padrão de `relatorio-mensal-pdf.ts`: A4, `fontePdfSegura`, `embedLogoNoPdf`, paginação com cabeçalho repetido); Test `src/__tests__/fechamento-demonstrativo.test.ts` (XLSX: descompactar com `src/lib/xlsx/zip.ts` se houver leitor, senão conferir que o buffer começa com `PK` e que o XML da aba contém as linhas; PDF: `PDFDocument.load` e número de páginas > 0; texto com acentos não quebra).

```ts
export type DemonstrativoDados = {
  empresa: { nome: string; cnpj: string | null };
  competencia: string; versao: number; diaCorte: number; vencimentoPix: Date; responsavel: string | null;
  linhas: { identificador: string; colaborador: string; matricula: string | null; valor: number; vencimento: Date; lote: number | null; situacao: string }[];
  ajustes: { valor: number; justificativa: string }[];
  totalBruto: number; totalAjustes: number; totalFinal: number;
};
```
- [ ] Commit `feat(fechamento): demonstrativo em XLSX e PDF`.

### Task 6: Envio ao RH

**Files:** Modify `src/lib/email-tipos.ts` (tipo `"fechamento"`, rótulo "Demonstrativo mensal"); Create `src/lib/fechamento-envio.ts` (`enviarFechamento({ fechamentoId, usuario })`: exige `conferido`; monta `DemonstrativoDados` da versão atual; gera PDF (sem Pix nesta fase) → `ArquivoFinanceiro`; `sendEmail({ to: emailRh, cc: emailsCopia(empresa.emailCopia, emailRh), subject: "Demonstrativo BFX — <competência> — <empresa>", html, attachments: [PDF, XLSX], registro: { tipo: "fechamento", empresaId, origem: "manual" } })`; depois `marcarEnviado`; empresa sem `emailRh` → erro claro antes de gerar nada); Test `src/__tests__/fechamento-envio.test.ts` (mock de `@/lib/email`).
- [ ] O HTML do e-mail: saudação curta, competência, valor final em destaque, "Vencimento do Pix: DD/MM/AAAA", lista dos anexos. Reusar o helper de HTML/escape que `src/lib/email.ts` já usa (`@/lib/html`).
- [ ] Commit `feat(fechamento): envio do demonstrativo ao RH`.

### Task 7: Telas

**Files:** Create `src/app/(app)/fechamento/page.tsx` (grade empresa × competência: empresas com alguma regra `cobrancaViaBfx`, competências dos próximos 3 meses e dos fechamentos existentes; célula com status/total/link; ação "Gerar" nas vazias), `src/app/(app)/fechamento/[id]/page.tsx` (detalhe), `src/app/(app)/fechamento/actions.ts` (actions finas sobre `fechamento-db`/`fechamento-envio`, todas com `requireAdminOrThrow()` na 1ª linha, `createAuditLog("fechamento:<acao>")`, `revalidatePath`), `src/components/fechamento-detalhe-client.tsx`; Modify menu (`layout.tsx` `adminMenu` += `/fechamento` "Fechamento"; `sidebar-nav.tsx` ícone `CalendarCheck` do lucide, grupo "Financeiro").
- [ ] Detalhe conforme artboard: cabeçalho com ações (Atualizar parcelas, Adicionar ajuste, Conferir e gerar versão / Reabrir para corrigir / Enviar ao RH conforme status), stepper de status (`<ol>` com `aria-current="step"`), faixa de metadados (competência, corte, Pix vence em, responsável, versão + histórico de envios com link para `/relatorios/emails?empresa=`), tabela "No demonstrativo" (identificador, colaborador, vencimento, badge Prudent "lote N · boleto à BFX" ou "fica com a BFX", valor), cartão "Fora do demonstrativo" com motivo de cada bloqueada, cartão "Valor do Pix" (bruto, ajustes com justificativa e botão remover em preparação, valor final grande). Aviso quando `desatualizado`: "Parcelas mudaram desde a geração." com botão Atualizar. Downloads da versão (PDF/XLSX) via `/api/arquivos/[id]`.
- [ ] Estados: sem empresa com cobrança via BFX (mensagem da Global Constraints), fechamento sem parcelas ("Nenhuma parcela vence em <competência> para esta empresa."), erro das actions em `toast`.
- [ ] Travas de design; `impeccable` polish + detect. Commit `feat(fechamento): telas do fechamento por empresa`.

### Task 8: Verificação

- [ ] Suíte inteira; `tsc`; travas; eslint nos tocados.
