# Fase 4 — Boletos Prudent, agenda de obrigações, caixa e alertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao concluir um lote, criar os boletos Prudent esperados (um por vencimento); permitir anexar o PDF e a linha digitável (decodificada), registrar pagamentos sem baixa duplicada, substituir boleto sem perder o original, ver a projeção de caixa de 60 dias e receber alertas.

**Architecture:** Regras puras em `src/lib/boleto-prudent.ts` (agrupamento, status, validação de pagamento), `src/lib/linha-digitavel.ts` (decodificação) e `src/lib/projecao-caixa.ts`. Gravações em `src/lib/boleto-prudent-db.ts`. Arquivos privados (PDF do boleto, comprovantes) em bytes no banco (`ArquivoFinanceiro`), no padrão de `Documento` — o bucket MinIO só serve chaves públicas (`src/lib/storage-policy.ts:50`). Tela `/obrigacoes` (admin). Alertas estendem o cron existente `api/cron/alertas-admin` (já agendado; nenhuma mudança em `deploy/`).

**Tech Stack:** Next.js 16 App Router, Prisma 6, vitest, shadcn, sonner.

**Spec:** `docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md` §3.4, §3.5, §6.

## Global Constraints

- Mesmas das fases anteriores (worktree, testes, `requireAdminOrThrow()` na 1ª linha de action que grava, commits por caminho com os dois trailers, sem push, travas de design, sem `RegExp` + `.exec(`).
- Só boletos com `direcionamento = "bfx"` são obrigação da BFX (entram na projeção e nos alertas de pagamento). Os de `"empresa"` aparecem na agenda como "a empresa paga", sem ação de pagamento.
- `registrarLoteConcluido` (antecipação feita fora do sistema) **não** cria boletos.
- Upload: server action com `File`, limite 10 MB (`next.config.ts` já é 10mb), só `application/pdf`, `image/png`, `image/jpeg` conferidos pelos bytes (PDF começa com `%PDF`; reusar `validarImagem` de `@/lib/upload-imagem` para imagens).
- Visual: artboard "Obrigações — boletos Prudent e caixa" (`/private/tmp/claude-501/-Users-andrebrumcortezferreira-Documents-BFX-sitema-bfx/ceecb562-b893-48e9-bfaf-875587772480/scratchpad/canvas-fechamento/project/Obrigacoes.dc.html`). Padrões do app: `PageHeader`, `CardStats`, `QueryTabs`, `Table`, `Dialog`, `AlertDialog`, `toast` (sonner), `CurrencyInput`, `DateInput`. Depois da UI: `impeccable` polish + `impeccable detect --json` uma vez (ignorar "overused-font").

## Review Focus

1. Dois cliques em "Registrar pagamento" → um pagamento só (status anterior no `where` + `comprovanteHash` único).
2. Linha digitável com um dígito trocado → recusa por DV, com mensagem, e opção de digitar valor/vencimento à mão.
3. Fator de vencimento depois de 22/02/2025 (reinício do fator em 1000) → data certa.
4. Parcelas do mesmo lote com vencimentos em dias diferentes do mesmo mês → boletos diferentes.
5. Desfazer a baixa Prudent de parcela que tem boleto → recusado.

---

### Task 1: Schema e migração

**Files:** `prisma/schema.prisma`; Create `prisma/migrations/20260930140000_boletos_prudent/migration.sql`.

- [ ] Modelos:
  ```prisma
  model ArquivoFinanceiro {
    id          Int      @id @default(autoincrement())
    nome        String
    contentType String   @map("content_type")
    tamanho     Int
    sha256      String   @map("sha256")
    conteudo    Bytes
    criadoEm    DateTime @default(now()) @map("criado_em")
    criadoPor   String?  @map("criado_por")
    @@index([sha256])
    @@map("arquivos_financeiros")
  }

  model BoletoPrudent {
    id                       Int       @id @default(autoincrement())
    loteId                   Int       @map("lote_id")
    empresaParceiraId        Int?      @map("empresa_parceira_id")
    vencimento               DateTime
    valorEsperado            Float     @map("valor_esperado")
    valorDocumento           Float?    @map("valor_documento")
    vencimentoDocumento      DateTime? @map("vencimento_documento")
    linhaDigitavel           String?   @unique @map("linha_digitavel")
    pdfArquivoId             Int?      @map("pdf_arquivo_id")
    direcionamento           String    @default("empresa")
    status                   String    @default("aguardando_documento")
    divergenciaJustificativa String?   @map("divergencia_justificativa")
    substituiId              Int?      @unique @map("substitui_id")
    criadoEm                 DateTime  @default(now()) @map("criado_em")
    atualizadoEm             DateTime  @updatedAt @map("atualizado_em")

    lote        AnticipacaoBatch   @relation(fields: [loteId], references: [id], onDelete: Restrict)
    pdf         ArquivoFinanceiro? @relation("boleto_pdf", fields: [pdfArquivoId], references: [id], onDelete: SetNull)
    substitui   BoletoPrudent?     @relation("substituicao", fields: [substituiId], references: [id], onDelete: Restrict)
    substituto  BoletoPrudent?     @relation("substituicao")
    parcelas    ParcelaVencimento[]
    pagamentos  BoletoPagamento[]

    @@index([vencimento])
    @@index([loteId])
    @@map("boletos_prudent")
  }

  model BoletoPagamento {
    id                   Int       @id @default(autoincrement())
    boletoId             Int       @map("boleto_id")
    dataPagamento        DateTime  @map("data_pagamento")
    valorPrincipal       Float     @map("valor_principal")
    valorEncargos        Float     @default(0) @map("valor_encargos")
    comprovanteArquivoId Int?      @map("comprovante_arquivo_id")
    comprovanteHash      String?   @unique @map("comprovante_hash")
    autenticacao         String?
    registradoPor        String?   @map("registrado_por")
    criadoEm             DateTime  @default(now()) @map("criado_em")
    estornadoEm          DateTime? @map("estornado_em")
    estornadoPor         String?   @map("estornado_por")

    boleto      BoletoPrudent      @relation(fields: [boletoId], references: [id], onDelete: Restrict)
    comprovante ArquivoFinanceiro? @relation("pagamento_comprovante", fields: [comprovanteArquivoId], references: [id], onDelete: SetNull)

    @@index([boletoId])
    @@map("boletos_prudent_pagamentos")
  }
  ```
  `ParcelaVencimento` += `boletoPrudentId Int? @map("boleto_prudent_id")` com relação `boletoPrudent BoletoPrudent? @relation(fields: [boletoPrudentId], references: [id], onDelete: Restrict)` e `@@index([boletoPrudentId])`. `AnticipacaoBatch` += `boletos BoletoPrudent[]`. `ArquivoFinanceiro` += as relações inversas (`boletosPdf BoletoPrudent[] @relation("boleto_pdf")`, `pagamentos BoletoPagamento[] @relation("pagamento_comprovante")`). `Config` += `emailFinanceiro String? @map("email_financeiro")`.
- [ ] SQL gerado com `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script --shadow-database-url postgresql://postgres:pg@localhost:55432/shadow` e acrescido, à mão, do índice parcial:
  ```sql
  -- Um boleto vivo por lote e vencimento; substituídos e cancelados ficam no histórico.
  CREATE UNIQUE INDEX "boletos_prudent_lote_vencimento_vivo" ON "boletos_prudent" ("lote_id", "vencimento")
    WHERE "status" NOT IN ('substituido', 'cancelado');
  ```
  (índice parcial não é representável no schema Prisma; documentar no comentário da migração e conferir que `migrate diff` não o acusa como drift — índices fora do schema não geram diff de remoção em `migrate deploy`.)
- [ ] Testar em Postgres 16 local (todas as migrações em ordem; inserir dois boletos vivos no mesmo lote/vencimento → erro; um `substituido` + um vivo → ok). `prisma generate`. Commit `feat(obrigacoes): tabelas de boletos Prudent, pagamentos e arquivos`.

### Task 2: Linha digitável (pura)

**Files:** Create `src/lib/linha-digitavel.ts`; Test `src/__tests__/linha-digitavel.test.ts`.

**Produces:**
```ts
export type LinhaDecodificada =
  | { ok: true; tipo: "bancario"; linha: string; codigoBarras: string; valor: number | null; vencimento: Date | null }
  | { ok: true; tipo: "arrecadacao"; linha: string; codigoBarras: string; valor: number | null; vencimento: null }
  | { ok: false; erro: string };
export function somenteDigitos(s: string): string;
export function modulo10(numero: string): number;
export function modulo11Bancario(numero: string): number; // DV do código de barras bancário (0,10,11 → 1)
export function codigoBarrasDeLinhaBancaria(linha47: string): string;
export function linhaBancariaDeCodigoBarras(codigo44: string): string; // usada nos testes para montar linhas válidas
export function decodificarLinhaDigitavel(entrada: string, referencia?: Date): LinhaDecodificada;
```
Regras:
- Bancário (47 dígitos): campos `AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV`; X, Y, Z = módulo 10 dos campos 1–3; montar o código de barras (44) = banco+moeda (4) + K + fator (4) + valor (10) + campo livre (25) e conferir K = `modulo11Bancario` do código sem a posição 5. Erros: `"Linha digitável com 47 dígitos esperada."`, `"Dígito verificador do campo N não confere."`, `"Dígito verificador geral não confere."`.
- Valor = últimos 10 dígitos / 100; `0` → `null` (boleto sem valor).
- Fator de vencimento: `0000` → `null`. Base 1: 07/10/1997 + fator dias. Base 2 (reinício em 22/02/2025): 22/02/2025 + (fator − 1000) dias. Escolher o candidato mais próximo de `referencia` (default `new Date()`); tudo em UTC, data pura.
- Arrecadação (48 dígitos, começa com `8`): 4 blocos de 11+DV; o 3º dígito define o módulo dos DVs (6 ou 7 → mod 10; 8 ou 9 → mod 11); valor = dígitos 5–15 do código de barras (44) / 100 quando o 3º dígito é 6 ou 8; senão `null`. Vencimento sempre `null`.
- Qualquer outro tamanho → `{ ok:false, erro:"Linha digitável deve ter 47 (boleto) ou 48 (convênio) dígitos." }`.
- [ ] Testes: montar um código de barras bancário de exemplo (`"0019" + K + fator + valor + 25 dígitos`), calcular K com `modulo11Bancario`, gerar a linha com `linhaBancariaDeCodigoBarras` e decodificar de volta (valor e data); trocar um dígito de cada campo → erro do campo; fator 1000 com referência 2026-09-30 → 22/02/2025 (candidato novo) e fator 9999 com referência 2025-01-01 → 21/02/2025; entrada com pontos e espaços é aceita; arrecadação válida construída no teste com DVs mod 10.
- [ ] Commit `feat(obrigacoes): decodificacao da linha digitavel`.

### Task 3: Regras puras do boleto

**Files:** Create `src/lib/boleto-prudent.ts`; Test `src/__tests__/boleto-prudent.test.ts`.

**Produces:**
```ts
export const STATUS_BOLETO = { aguardandoDocumento: "aguardando_documento", aPagar: "a_pagar", pagoParcial: "pago_parcial", pago: "pago", substituido: "substituido", cancelado: "cancelado" } as const;
export const DIRECIONAMENTO = { empresa: "empresa", bfx: "bfx" } as const;
export function agruparParcelasPorVencimento(parcelas: { id: number; dataVencimento: Date; valorParcela: number }[]): { vencimento: Date; parcelaIds: number[]; valorEsperado: number }[]; // chave = data pura UTC (YYYY-MM-DD); soma em centavos
export function valorDoBoleto(b: { valorDocumento: number | null; valorEsperado: number }): number;
export function statusPorPagamentos(b: { status: string; valorDocumento: number | null; valorEsperado: number }, pagamentos: { valorPrincipal: number; estornadoEm: Date | null }[]): string; // mantém substituido/cancelado/aguardando_documento; senão 0 → a_pagar, < valor → pago_parcial, ≥ valor − 0,01 → pago
export function validarNovoPagamento(b: { status: string; valorDocumento: number | null; valorEsperado: number }, pagos: { valorPrincipal: number; estornadoEm: Date | null }[], novoPrincipal: number): { ok: true } | { ok: false; erro: string };
  // recusa: status substituido/cancelado ("Boleto substituído ou cancelado não recebe pagamento."), aguardando_documento ("Anexe o boleto antes de registrar o pagamento."), principal ≤ 0, soma > valor + 0,01 ("O pagamento passa do valor do boleto em R$ X.")
export function divergencia(b: { valorEsperado: number; vencimento: Date }, doc: { valor: number | null; vencimento: Date | null }): { valor: boolean; vencimento: boolean };
export function saldoDoBoleto(b, pagamentos): number;
```
- [ ] Testes de tabela para cada função (inclui estorno ignorado na soma e tolerância de 1 centavo).
- [ ] Commit `feat(obrigacoes): regras puras do boleto Prudent`.

### Task 4: Boletos nascem na conclusão do lote

**Files:** Create `src/lib/boleto-prudent-db.ts`; Modify `src/lib/lote-antecipacao-db.ts` (`concluirLote`); Test: estender `src/__tests__/lote-antecipacao.test.ts` (mock ganha `boletoPrudent: { create, findMany }`, `regraEmpresa` via mock de `@/lib/regra-empresa-db`).

**Produces:** `export async function criarBoletosDoLote(tx: TxBoleto, lote: { id: number; empresaParceiraId: number | null }, parcelas: { id; dataVencimento; valorParcela }[]): Promise<number[]>;` — um `boletoPrudent.create` por grupo de `agruparParcelasPorVencimento`, `direcionamento` = `"bfx"` se `regraVigente(regras da empresa, vencimento).cobrancaViaBfx`, senão `"empresa"`; depois `parcelaVencimento.updateMany({ where: { id: { in: grupo.parcelaIds } }, data: { boletoPrudentId } })`.
- [ ] `concluirLote` chama dentro da mesma transação, depois de marcar antecipada/paga. `registrarLoteConcluido` e `cancelarLote` não mudam.
- [ ] Testes: 3 parcelas em 2 datas → 2 boletos com somas certas; empresa com `cobrancaViaBfx` → `"bfx"`; lote sem empresa → `"empresa"`.
- [ ] Commit `feat(obrigacoes): boletos Prudent esperados na conclusao do lote`.

### Task 5: Travas nos fluxos de baixa

**Files:** Modify `src/app/(app)/historico/baixa-actions.ts` (`desfazerBaixaParcela`: se a parcela tem `boletoPrudentId` e `origemPagamento === "prudent"` → `{ ok:false, erro: "Esta parcela tem boleto da Prudent; a antecipação não pode ser desfeita por aqui." }`; `darBaixaParcelas`: acrescentar `antecipacaoLoteId: null` ao `where`, igual à versão individual). Test: `src/__tests__/baixa-manual.test.ts` (estender).
- [ ] Commit `fix(baixa): travas de boleto Prudent e de lote aberto`.

### Task 6: Arquivos financeiros e actions do boleto

**Files:** Create `src/lib/arquivo-financeiro.ts` (`salvarArquivoFinanceiro(file: File, usuario): Promise<{ id; sha256 }>` valida tamanho/tipo pelos bytes; `sha256Hex(buffer)`), `src/app/api/arquivos/[id]/route.ts` (GET, `requireAdmin()` → 403, `Content-Disposition: inline`, `Cache-Control: no-store`), `src/app/(app)/obrigacoes/actions.ts`; Tests: `src/__tests__/arquivo-financeiro.test.ts`, `src/__tests__/obrigacoes-actions.test.ts`.

**Produces (actions, todas com `requireAdminOrThrow()` na 1ª linha, `revalidatePath("/obrigacoes")`, `createAuditLog("obrigacoes:<acao>", ...)`):**
```ts
export async function anexarDocumentoBoleto(fd: FormData): Promise<Resp>; // boletoId, pdf (File, opcional), linhaDigitavel, valorManual?, vencimentoManual?, justificativa?
  // decodifica; se não decodifica, exige valorManual + vencimentoManual; se divergir do esperado, exige justificativa (≥ 5 chars);
  // grava valorDocumento, vencimentoDocumento, linhaDigitavel (só dígitos), pdfArquivoId; status aguardando_documento → a_pagar (updateMany com status no where)
export async function registrarPagamentoBoleto(fd: FormData): Promise<Resp>; // boletoId, dataPagamento, valorPrincipal, valorEncargos, comprovante (File, opcional), autenticacao?
  // transação: lê boleto + pagamentos; validarNovoPagamento; salva comprovante (hash único → erro "Este comprovante já foi usado."); cria pagamento; novo status = statusPorPagamentos; updateMany where { id, status: statusAnterior } → count 0 → throw "O boleto mudou enquanto você registrava. Recarregue."
export async function estornarPagamentoBoleto(pagamentoId: number): Promise<Resp>; // marca estornadoEm/Por e recalcula status
export async function substituirBoleto(fd: FormData): Promise<Resp>; // boletoId; cria novo com substituiId, mesmo lote/vencimento/valorEsperado/direcionamento; move parcelas; original → substituido (na mesma transação, original primeiro para liberar o índice parcial); depois o fluxo normal de anexar
export async function alterarDirecionamento(boletoId: number, destino: "empresa" | "bfx"): Promise<Resp>;
  // muda o direcionamento de boletos vivos e audita. A trava "bfx→empresa só sem parcela em fechamento conferido" é acrescentada na Fase 5, quando fechamentoId existir.
type Resp = { ok: true } | { ok: false; erro: string };
```
- [ ] Testes: guarda primeiro; pagamento duplo (segundo `updateMany` com count 0) → erro; comprovante repetido → erro; pagamento que passa do valor → erro; linha inválida sem manual → erro; divergência sem justificativa → erro; substituição move parcelas e preserva original.
- [ ] Commit `feat(obrigacoes): anexar boleto, registrar pagamento e substituir`.

### Task 7: Projeção de caixa (pura)

**Files:** Create `src/lib/projecao-caixa.ts`; Test `src/__tests__/projecao-caixa.test.ts`.

**Produces:**
```ts
export type Movimento = { data: Date; valor: number; tipo: "boleto" | "pix" | "deposito"; ref?: string };
export function projetarCaixa(entrada: { hoje: Date; dias: number; boletos: { vencimento: Date; saldo: number; dataPix: Date | null }[]; pixEsperados: { data: Date; valor: number }[]; depositosPrevistos: { data: Date; valor: number }[] }): {
  serie: { data: string; acumulado: number }[]; // acumulado = Σ saídas − Σ entradas até o dia, piso 0 (só o que falta)
  antesDoPix: number; depoisDoPix: number;       // boleto com dataPix e vencimento < dataPix → antes; senão depois
  pico: { valor: number; data: string } | null;
  vencidos: number;                              // boletos com vencimento < hoje e saldo > 0 (entram no dia de hoje)
};
```
- [ ] Testes: boleto dia 10 R$ 1.000 e Pix dia 15 R$ 1.000 → pico 1.000 no dia 10, zera no 15; depósito previsto no dia 12 reduz o acumulado; boleto vencido entra em hoje; sem movimentos → série zerada e `pico: null`.
- [ ] Commit `feat(obrigacoes): projecao de caixa`.

### Task 8: Tela `/obrigacoes`

**Files:** Create `src/app/(app)/obrigacoes/page.tsx` (server, `requireAdmin()`), `src/components/obrigacoes-client.tsx`; Modify `src/app/(app)/layout.tsx` (`adminMenu` += `{ href: "/obrigacoes", label: "Obrigações" }`), `src/components/sidebar-nav.tsx` (`iconMap["/obrigacoes"]` = `CalendarClock` do lucide; grupo "Financeiro"), `src/lib/revalidacao.ts` (se a tela mostra dado de venda, incluir em `ROTAS_VENDA`).
- [ ] Dados: boletos vivos + substituídos (filtro "Todos"), com lote, empresa, contagem de parcelas, pagamentos; `dataPix` de cada boleto = dia `diaPix` da regra vigente da empresa no mês do vencimento; `projetarCaixa` com `pixEsperados: []` nesta fase (Pix entra na Fase 6) e `depositosPrevistos` dos lotes `em_andamento` (`valorAprovado ?? valorLiquidoSolicitado`, em `dataDepositoPrevista`), só boletos `"bfx"`.
- [ ] UI conforme artboard: três `CardStats` (a pagar antes do Pix — warning; depois — neutro; maior valor a financiar — error, com data do pico), gráfico de degraus da série (SVG inline com `role="img"` e `aria-label`, cores por token via `currentColor`/classes), `QueryTabs` A pagar / Sem boleto / Pagos / Todos, tabela (Vence, Empresa, Lote, Parcelas, Esperado, No boleto — em `text-destructive` quando diverge —, Situação em `Badge`, ação), dialogs "Anexar boleto" (arquivo PDF + linha digitável; mostra valor/vencimento decodificados e a divergência antes de salvar; campos manuais aparecem quando não decodifica) e "Registrar pagamento" (data, principal pré-preenchido com o saldo, encargos, comprovante, autenticação). Boleto `"empresa"` mostra "a empresa paga" e nenhuma ação. Estado vazio: "Nenhum boleto da Prudent ainda. Eles aparecem aqui quando um lote é concluído."
- [ ] Travas de design; `impeccable` polish + detect. Commit `feat(obrigacoes): agenda de boletos Prudent e projecao de caixa`.

### Task 9: Alertas e e-mail do financeiro

**Files:** Modify `src/app/api/cron/alertas-admin/route.ts` (novos prefixos `[Alerta] Boleto Prudent vencendo` — `a_pagar`/`pago_parcial` e `"bfx"` com vencimento ≤ hoje+3 — e `[Alerta] Boleto Prudent sem documento` — `aguardando_documento` e `"bfx"` com vencimento ≤ hoje+5; mesma idempotência de 20h; link `/obrigacoes`), `src/app/(app)/configuracoes/page.tsx` (campo "E-mail do financeiro" na aba de e-mail, salvo em `Config.emailFinanceiro`, validado com `@/lib/email-endereco`); Test: `src/__tests__/alertas-admin-obrigacoes.test.ts` (mock de `@/lib/db`, `@/lib/segredo`).
- [ ] O alerta "Pix não entrou" fica para a Fase 6 (precisa de fechamento).
- [ ] Commit `feat(obrigacoes): alertas de boletos Prudent`.

### Task 10: Verificação

- [ ] Suíte inteira; `tsc`; travas de design; eslint nos arquivos tocados.
