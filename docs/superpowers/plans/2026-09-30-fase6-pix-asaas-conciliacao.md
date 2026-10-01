# Fase 6 — Pix Asaas, recebimentos, liquidação e conciliação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao enviar o fechamento, criar uma cobrança Pix no Asaas (QR Code e copia-e-cola no PDF e no e-mail); receber a confirmação pelo webhook ou registrar recebimento manual em dois passos; liquidar as parcelas quando o valor final for recebido; conciliar boletos Prudent × demonstrativo; mostrar "conciliado" e "concluído"; alertar Pix atrasado.

**Architecture:** Cliente HTTP do Asaas ganha Pix, QR Code, cancelamento e cliente da empresa (`src/lib/asaas.ts`). Regras puras em `src/lib/recebimento-fechamento.ts` e `src/lib/conciliacao-fechamento.ts`. Gravações em `src/lib/recebimento-fechamento-db.ts`. O webhook existente desvia para o fechamento quando a cobrança pertence a um (`CobrancaFechamento` ou `externalReference` `FEC-`), sem mudar o caminho de baixa de parcela.

**Tech Stack:** Next.js 16, Prisma 6, API Asaas v3, vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md` §3.6 (cobrança e recebimento), §5.2, §5.3, §6 (conciliação e alerta do Pix).

## Global Constraints

- Mesmas das fases anteriores.
- O recebimento pertence ao **fechamento**, não à versão. Pagamento de cobrança já cancelada conta como dinheiro real.
- Pagamento parcial não liquida parcela. Excedente vira "crédito a resolver" (alerta, sem ação automática).
- Só recebimento `confirmado` conta. Anexar comprovante nunca confirma sozinho.
- `paga` mantém a semântica: não antecipada liquidada → `paga = true`, `origemPagamento = "pix_fechamento"`; antecipada → só `liquidadaEm`.
- Webhook responde 200 mesmo em falha de processamento (padrão atual), com log.
- Visual: artboard "Fechamento por empresa" (bloco do Pix) e "Obrigações" (entradas do Pix na projeção). `impeccable` polish + detect depois da UI.

## Review Focus

1. O mesmo evento `PAYMENT_RECEIVED` chega duas vezes → um recebimento (unique `asaasPaymentId`).
2. RH paga a cobrança da versão 1 depois que a versão 2 foi enviada → recebimento entra, saldo recalcula, excedente sinalizado.
3. Cancelar no Asaas uma cobrança que acabou de ser paga → não marcar `cancelada` (conferir status antes; se `RECEIVED`/`CONFIRMED`, registrar recebimento).
4. Estorno (`PAYMENT_REFUNDED`) depois de liquidado → desfaz a liquidação (`liquidadaEm` e `paga` de origem `pix_fechamento`) e alerta.
5. Empresa sem CNPJ → "Enviar" recusa antes de criar nada, com mensagem.

---

### Task 1: Schema

**Files:** `prisma/schema.prisma`; migração `20260930160000_cobranca_recebimento_fechamento` via `prisma migrate diff`.
- [ ] `CobrancaFechamento` (`cobrancas_fechamento`): `id`, `fechamentoId` (Restrict), `versaoId` (Restrict), `asaasPaymentId String @unique`, `externalReference String`, `valor Float`, `vencimento DateTime`, `status String @default("ativa")` (`ativa|cancelada|paga`), `pixCopiaECola String?`, `qrCodePng Bytes?`, `criadaEm`, `canceladaEm DateTime?`.
- [ ] `RecebimentoFechamento` (`recebimentos_fechamento`): `id`, `fechamentoId` (Restrict), `cobrancaId Int?`, `origem String` (`asaas|manual`), `valor Float`, `dataRecebimento DateTime`, `asaasPaymentId String? @unique`, `endToEndId String?`, `comprovanteArquivoId Int?` (→ `ArquivoFinanceiro`, SetNull), `status String` (`pendente|confirmado|estornado`), `registradoPor String?`, `confirmadoPor String?`, `confirmadoEm DateTime?`, `estornadoEm DateTime?`, `criadoEm`.
- [ ] `EmpresaParceira` += `asaasCustomerId String? @map("asaas_customer_id")`.
- [ ] Postgres local, diff vazio, generate. Commit `feat(fechamento): cobranca Pix e recebimentos`.

### Task 2: Asaas — Pix, QR Code, cancelamento, cliente da empresa

**Files:** Modify `src/lib/asaas.ts`; Test `src/__tests__/asaas-pix.test.ts` (mock de `fetch` global).

**Produces:**
```ts
export async function createPixPayment(p: { customerId: string; value: number; dueDate: string; description: string; externalReference: string }, config: AsaasConfig): Promise<{ id: string; status: string }>; // POST /v3/payments billingType "PIX"
export async function getPixQrCode(config: AsaasConfig, paymentId: string): Promise<{ payload: string; encodedImage: string; expirationDate?: string | null }>; // GET /v3/payments/{id}/pixQrCode
export async function cancelPayment(config: AsaasConfig, paymentId: string): Promise<void>; // DELETE /v3/payments/{id}
export async function getOrCreateCustomerEmpresa(empresa: { id: number; nome: string; cnpj: string | null; emailRh: string | null; asaasCustomerId: string | null }, prisma: { empresaParceira: { update: Function } }, config: AsaasConfig): Promise<string>;
  // exige CNPJ com 14 dígitos (erro "Cadastre o CNPJ da empresa para gerar o Pix."); mesma lógica de duplicata do getOrCreateCustomer (busca por cpfCnpj); grava EmpresaParceira.asaasCustomerId
```
Todas via `asaasFetch` existente. Testes: payload enviado (billingType PIX, externalReference), URL do QR, método DELETE, CNPJ ausente → erro sem chamar a API, duplicata → busca e reaproveita.
- [ ] Commit `feat(asaas): cobranca Pix, QR Code, cancelamento e cliente da empresa`.

### Task 3: Regras puras de recebimento e conciliação

**Files:** Create `src/lib/recebimento-fechamento.ts`, `src/lib/conciliacao-fechamento.ts`; Tests correspondentes.

```ts
// recebimento-fechamento.ts
export function referenciaExterna(empresaId: number, competencia: string, versao: number): string; // "FEC-7-2026-10-v2"
export function lerReferenciaExterna(ref: string | null | undefined): { empresaId: number; competencia: string; versao: number } | null; // via split("-")
export function situacaoRecebimento(totalFinal: number, recebimentos: { valor: number; status: string }[]): { recebido: number; saldo: number; excedente: number; status: "enviado" | "pago_parcial" | "pago" }; // soma só confirmados; tolerância 0,01
export function validarRecebimentoManual(input: { valor: unknown; data: unknown }): { ok: true; valor: number; data: Date } | { ok: false; erro: string };

// conciliacao-fechamento.ts
export type Divergencia =
  | { tipo: "antecipada_sem_boleto"; identificador: string; valor: number }
  | { tipo: "boleto_valor_diferente"; boletoId: number; esperado: number; documento: number }
  | { tipo: "boleto_com_parcela_fora"; boletoId: number; identificador: string; valor: number };
export function conciliarBoletosComDemonstrativo(linhas: { identificador: string; parcelaId: number | null; antecipada: boolean; boletoPrudentId: number | null; valor: number }[], boletos: { id: number; status: string; valorEsperado: number; valorDocumento: number | null; parcelaIds: number[] }[]): { somaLinhasAntecipadas: number; somaBoletos: number; diferenca: number; divergencias: Divergencia[] };
export function estadoFinal(f: { status: string }, boletosDasLinhas: { status: string }[], divergencias: Divergencia[]): { conciliado: boolean; concluido: boolean }; // conciliado = pago ∧ todos pagos; concluido = conciliado ∧ sem divergências
```
- [ ] Testes de tabela; commit `feat(fechamento): regras de recebimento e conciliacao`.

### Task 4: Envio com Pix

**Files:** Modify `src/lib/fechamento-envio.ts` (Fase 5); Create `src/lib/cobranca-fechamento-db.ts`; Test estender `src/__tests__/fechamento-envio.test.ts`.
- [ ] Antes do e-mail: `getOrCreateCustomerEmpresa`; para cada `CobrancaFechamento` `ativa` do fechamento de versão anterior: `getPayment` → se `RECEIVED|CONFIRMED|RECEIVED_IN_CASH` marcar `paga` e registrar recebimento (mesma função do webhook, Task 5); senão `cancelPayment` e marcar `cancelada` (updateMany com `status: "ativa"` no where). Depois `createPixPayment({ value: totalFinal − recebidoConfirmado, dueDate: dia diaPix da competência (se já passou, hoje), externalReference: referenciaExterna(...) })`, `getPixQrCode`, gravar `CobrancaFechamento` com copia-e-cola e PNG (base64 → Bytes). Saldo ≤ 0 → não cria cobrança.
- [ ] PDF (`gerarFechamentoPdf`) recebe `pix: { copiaECola, qrPng }` e desenha o bloco "Pague com Pix" (QR 120pt + copia-e-cola quebrado em linhas + "Vencimento DD/MM/AAAA" + "Identificação: FEC-…"). E-mail mostra o copia-e-cola num bloco monoespaçado e o QR como anexo `pix-<competencia>.png`.
- [ ] Asaas sem configuração → erro "Configure o Asaas em Configurações para gerar o Pix." antes de qualquer gravação.
- [ ] Commit `feat(fechamento): Pix do Asaas no envio do demonstrativo`.

### Task 5: Webhook, recebimentos e liquidação

**Files:** Create `src/lib/recebimento-fechamento-db.ts`; Modify `src/app/api/webhooks/asaas/route.ts` (depois da autenticação e do `getPayment`: se existe `CobrancaFechamento` com esse `asaasPaymentId` ou `lerReferenciaExterna(payment.externalReference)` não é nulo → `processarPagamentoFechamento(payment, evento)` e retornar; senão o fluxo atual); Tests: estender `src/__tests__/baixa-asaas-db.test.ts` (bloco do webhook) e criar `src/__tests__/recebimento-fechamento-db.test.ts`.

**Produces:**
```ts
export async function processarPagamentoFechamento(p: AsaasPagamentoDetalhe, evento: string | null): Promise<{ acao: "registrado" | "ja_registrado" | "estornado" | "ignorado" }>;
  // status RECEIVED|CONFIRMED|RECEIVED_IN_CASH → create RecebimentoFechamento confirmado (P2002 no asaasPaymentId → "ja_registrado"), cobrança → paga, recalcular
  // REFUNDED|REFUND_REQUESTED|CHARGEBACK_* → recebimento estornado, recalcular, notificar admins
export async function registrarRecebimentoManual(e: { fechamentoId: number; valor: number; data: Date; comprovante: File | null; usuario: string | null }): Promise<void>; // pendente
export async function confirmarRecebimento(e: { recebimentoId: number; usuario: string | null }): Promise<void>; // pendente → confirmado (where status pendente), recalcular
export async function estornarRecebimento(e: { recebimentoId: number; usuario: string | null }): Promise<void>;
export async function recalcularFechamento(tx, fechamentoId: number): Promise<void>;
  // situacaoRecebimento sobre a versão atual → status enviado/pago_parcial/pago;
  // entrou em pago: parcelas com fechamentoId → liquidadaEm = data do último recebimento confirmado; não antecipadas e não pagas → paga true, dataPagamento, origemPagamento "pix_fechamento";
  // saiu de pago: desfaz liquidadaEm e o paga de origem "pix_fechamento"; excedente > 0 → notificação "[Alerta] Crédito a resolver"
```
- [ ] Testes: evento duplicado; pagamento da versão antiga; parcial → pago_parcial sem liquidar; total → liquida e marca paga só as não antecipadas; estorno desfaz; manual pendente não conta; confirmar conta.
- [ ] Commit `feat(fechamento): recebimento pelo webhook e manual, com liquidacao`.

### Task 6: Alerta do Pix e caixa com Pix esperado

**Files:** Modify `src/app/api/cron/alertas-admin/route.ts` (prefixo `[Alerta] Pix do fechamento não entrou`: fechamento `enviado`/`pago_parcial` com dia do Pix < hoje; mensagem com empresa, competência, saldo e soma dos boletos `"bfx"` das linhas ainda não pagos; além da notificação, `sendEmail` para `Config.emailFinanceiro` quando configurado, uma vez por fechamento por dia — mesma idempotência de 20h pelo prefixo + id); `src/app/(app)/obrigacoes/page.tsx` (`pixEsperados` = saldo de cada fechamento enviado/pago_parcial no dia do Pix); Test `src/__tests__/alertas-admin-pix.test.ts`.
- [ ] Commit `feat(fechamento): alerta de Pix atrasado e Pix na projecao de caixa`.

### Task 7: UI do recebimento e da conciliação

**Files:** Modify `src/components/fechamento-detalhe-client.tsx`, `src/app/(app)/fechamento/[id]/page.tsx`, `src/app/(app)/fechamento/actions.ts` (actions `registrarRecebimentoManualAction` com `File`, `confirmarRecebimentoAction`, `estornarRecebimentoAction` — `requireAdminOrThrow()` na 1ª linha).
- [ ] Cartão "Valor do Pix" ganha: cobrança ativa (copia-e-cola com botão Copiar, QR, vencimento, link para a cobrança no Asaas), recebido/saldo/excedente, lista de recebimentos (origem, valor, data, status, comprovante, ações Confirmar/Estornar), botão "Registrar recebimento manual" (dialog: valor, data, comprovante; texto "Fica pendente até alguém confirmar que o dinheiro está na conta.").
- [ ] Seção "Conciliação com os boletos Prudent": soma das linhas antecipadas × soma dos boletos, diferença, lista de divergências com rótulo claro; stepper mostra "Conciliado" e um selo "Concluído" quando `estadoFinal` diz.
- [ ] Grade `/fechamento`: célula mostra "Conciliado"/"Concluído".
- [ ] Travas; `impeccable` polish + detect. Commit `feat(fechamento): recebimentos e conciliacao na tela`.

### Task 8: Verificação

- [ ] Suíte inteira; `tsc`; travas; eslint nos tocados.
