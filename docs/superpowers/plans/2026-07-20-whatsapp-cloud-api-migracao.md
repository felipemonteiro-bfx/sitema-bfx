# Migração WhatsApp Cloud API — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a Evolution API pela Meta WhatsApp Cloud API como único canal de WhatsApp do BFX, com registro de mensagens, rastreio de entrega e campanhas por template aprovado.

**Architecture:** `src/lib/whatsapp.ts` continua sendo o único ponto de entrada dos consumidores; ganha a decisão texto-vs-template (janela de 24h) e o registro em um novo modelo `WhatsAppMensagem`. O webhook `/api/webhooks/meta-whatsapp` passa a validar assinatura HMAC, gravar inbounds e processar callbacks de status. Campanhas trocam texto livre por templates aprovados buscados na Graph API.

**Tech Stack:** Next.js 15 (App Router), Prisma + Postgres, Vitest, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-07-20-whatsapp-cloud-api-migracao-design.md`

## Global Constraints

- Cliente Prisma é importado de `@/lib/db` (`import { prisma } from "@/lib/db"`); os tipos vêm de `@/generated/prisma`.
- Testes ficam em `src/__tests__/**/*.test.ts` (padrão do `vitest.config.ts`). Rodar com `yarn vitest run <arquivo>`.
- Nenhum teste chama a rede: `fetch` sempre mockado com `vi.stubGlobal("fetch", ...)`, seguindo `src/__tests__/whatsapp-provider.test.ts`.
- **Proibido o padrão `RegExp exec`** — um hook de segurança do projeto bloqueia a edição. Usar `.split()` + regex simples.
- **Gerenciador de pacotes: Yarn 1.22 — sempre `yarn <cmd>`, nunca `npx`.** `npx prisma` baixa o Prisma 7 do registro (o projeto usa 6.5) e quebra no `prisma.config.ts`. Dependências já instaladas em `node_modules`; nenhuma dependência nova neste plano.
- **Banco de desenvolvimento: `bfx_dev`**, apontado pelo `.env` local (já configurado). O banco `bfx` do mesmo container tem dados reais e histórico de migrations divergente do repo — `prisma migrate dev` o resetaria. Não apontar o `.env` para `bfx`.
- Baseline verde antes de começar: 16 arquivos de teste, 114 testes passando; 45 migrations aplicadas.
- Não criar arquivos na raiz do projeto (requer `sudo`). Todos os caminhos abaixo são em subdiretórios.
- Idioma do código e comentários: português, seguindo o restante do projeto.
- TDD obrigatório para lógica: o teste que falha vem antes da implementação (regra do `CLAUDE.md` do projeto). **Exceção: componentes de UI.** O projeto não tem infraestrutura de teste de componente — o Playwright existente não cobre o CRM, e adicionar Testing Library traria dependências novas, fora do escopo desta migração. A Task 11 é verificada manualmente; isso é decisão explícita, não omissão.
- Commit ao fim de cada task. `git pull --rebase` antes de qualquer push (o CI faz commits automáticos no branch).
- Branch de trabalho: `nextjs-migration`.
- **Todo o código entra com `Config.whatsappProvider` ainda em `"evolution"`.** Nenhuma task deste plano vira a chave; o cutover é operacional e vem depois da Task 12.

---

### Task 1: Modelo `WhatsAppMensagem` e campos de Config

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_whatsapp_mensagem/migration.sql` (gerado pelo Prisma)

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: modelo Prisma `WhatsAppMensagem` acessível via `prisma.whatsAppMensagem`, com os campos listados abaixo; `CampanhaEnvio.mensagemId`; `Config.metaAppSecret`.

- [ ] **Step 1: Adicionar o modelo ao schema**

Em `prisma/schema.prisma`, adicionar ao fim do arquivo:

```prisma
/// Registro unificado de mensagens WhatsApp (entrada e saída).
/// Fonte de verdade do histórico por cliente, do status de entrega e da
/// janela de 24h. Não substitui WhatsAppEnvioLog, que segue sendo o guarda
/// de deduplicação dos crons.
model WhatsAppMensagem {
  id           Int      @id @default(autoincrement())
  clienteId    Int?     @map("cliente_id")
  telefone     String
  direcao      String                                  // in | out
  waMessageId  String?  @unique @map("wa_message_id")  // id da Meta (wamid.*)
  origem       String                                  // cron | campanha | venda | boleto | relatorio | pre_atendimento | manual
  templateNome String?  @map("template_nome")          // null quando texto livre
  corpo        String
  status       String   @default("pendente")           // pendente | enviado | entregue | lido | falhou
  erroCodigo   Int?     @map("erro_codigo")
  erroMsg      String?  @map("erro_msg")
  criadoEm     DateTime @default(now()) @map("criado_em")
  atualizadoEm DateTime @updatedAt @map("atualizado_em")

  envios       CampanhaEnvio[]

  @@index([clienteId, criadoEm])
  @@index([status, criadoEm])
  @@index([telefone, direcao, criadoEm])
  @@map("whatsapp_mensagens")
}
```

- [ ] **Step 2: Ligar `CampanhaEnvio` à mensagem**

Em `prisma/schema.prisma`, no modelo `CampanhaEnvio`, adicionar o campo e a relação (logo abaixo de `erro String?`):

```prisma
  mensagemId Int?     @map("mensagem_id")
```

E, junto da relação `campanha` já existente:

```prisma
  mensagem   WhatsAppMensagem? @relation(fields: [mensagemId], references: [id], onDelete: SetNull)
```

- [ ] **Step 3: Adicionar `metaAppSecret` ao Config**

Em `prisma/schema.prisma`, no modelo `Config`, logo abaixo de `metaWebhookVerifyToken`:

```prisma
  metaAppSecret             String?  @map("meta_app_secret")  // valida X-Hub-Signature-256 do webhook
```

- [ ] **Step 4: Gerar a migração**

Run: `yarn prisma migrate dev --name whatsapp_mensagem`
Expected: cria `prisma/migrations/<timestamp>_whatsapp_mensagem/migration.sql` com `CREATE TABLE "whatsapp_mensagens"`, `ALTER TABLE "campanha_envios" ADD COLUMN "mensagem_id"` e `ALTER TABLE "config" ADD COLUMN "meta_app_secret"`. Termina com "Your database is now in sync with your schema."

- [ ] **Step 5: Verificar que o cliente Prisma tem o novo modelo**

Run: `yarn tsc --noEmit -p tsconfig.json`
Expected: sem erros. (O `migrate dev` já roda `prisma generate`; se `prisma.whatsAppMensagem` não existir, rodar `yarn prisma generate`.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(whatsapp): modelo WhatsAppMensagem e Config.metaAppSecret"
```

---

### Task 2: Camada de registro de mensagens

**Files:**
- Create: `src/lib/whatsapp-mensagem.ts`
- Test: `src/__tests__/whatsapp-mensagem.test.ts`

**Interfaces:**
- Consumes: modelo `WhatsAppMensagem` da Task 1
- Produces:
  - `type OrigemMensagem = "cron" | "campanha" | "venda" | "boleto" | "relatorio" | "pre_atendimento" | "manual"`
  - `type StatusMensagem = "pendente" | "enviado" | "entregue" | "lido" | "falhou"`
  - `dentroDaJanela24h(telefone: string): Promise<boolean>`
  - `registrarSaida(input: RegistroSaida): Promise<number>` — devolve o `id` da mensagem
  - `marcarEnviada(id: number, waMessageId?: string): Promise<void>`
  - `marcarFalha(id: number, erroMsg: string, erroCodigo?: number): Promise<void>`
  - `registrarEntrada(input: RegistroEntrada): Promise<boolean>` — devolve `false` quando o `waMessageId` já existe (reentrega da Meta), sinalizando que não se deve processar de novo
  - `avancarStatusPorWaMessageId(waMessageId: string, novo: StatusMensagem, erro?: { codigo?: number; msg?: string }): Promise<void>`
  - `contarContatosUnicos24h(): Promise<number>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/whatsapp-mensagem.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  whatsAppMensagem: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  dentroDaJanela24h,
  registrarSaida,
  registrarEntrada,
  avancarStatusPorWaMessageId,
  contarContatosUnicos24h,
} = await import("@/lib/whatsapp-mensagem");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dentroDaJanela24h", () => {
  it("true quando há inbound nas últimas 24h", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 1 });
    expect(await dentroDaJanela24h("5592999999999")).toBe(true);
  });

  it("false quando não há inbound recente", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue(null);
    expect(await dentroDaJanela24h("5592999999999")).toBe(false);
  });

  it("consulta apenas direcao=in e telefone normalizado", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue(null);
    await dentroDaJanela24h("5592999999999");
    const where = prismaMock.whatsAppMensagem.findFirst.mock.calls[0]![0].where;
    expect(where.direcao).toBe("in");
    expect(where.telefone).toBe("5592999999999");
    expect(where.criadoEm.gte).toBeInstanceOf(Date);
  });
});

describe("registrarSaida", () => {
  it("cria a mensagem como pendente e devolve o id", async () => {
    prismaMock.whatsAppMensagem.create.mockResolvedValue({ id: 42 });
    const id = await registrarSaida({
      telefone: "5592999999999",
      clienteId: 7,
      origem: "cron",
      templateNome: "bfx_aniversario",
      corpo: "Parabéns, João!",
    });
    expect(id).toBe(42);
    const data = prismaMock.whatsAppMensagem.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      direcao: "out",
      status: "pendente",
      origem: "cron",
      templateNome: "bfx_aniversario",
    });
  });
});

describe("registrarEntrada", () => {
  it("grava o inbound novo e devolve true", async () => {
    prismaMock.whatsAppMensagem.findUnique.mockResolvedValue(null);
    prismaMock.whatsAppMensagem.create.mockResolvedValue({ id: 1 });
    const nova = await registrarEntrada({
      telefone: "5592999999999",
      waMessageId: "wamid.IN",
      corpo: "oi",
    });
    expect(nova).toBe(true);
    const data = prismaMock.whatsAppMensagem.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ direcao: "in", waMessageId: "wamid.IN" });
  });

  it("reentrega da Meta não duplica: devolve false e não cria", async () => {
    prismaMock.whatsAppMensagem.findUnique.mockResolvedValue({ id: 1 });
    const nova = await registrarEntrada({
      telefone: "5592999999999",
      waMessageId: "wamid.IN",
      corpo: "oi",
    });
    expect(nova).toBe(false);
    expect(prismaMock.whatsAppMensagem.create).not.toHaveBeenCalled();
  });
});

describe("avancarStatusPorWaMessageId", () => {
  it("avança de enviado para entregue", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "enviado" });
    await avancarStatusPorWaMessageId("wamid.A", "entregue");
    expect(prismaMock.whatsAppMensagem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: expect.objectContaining({ status: "entregue" }) })
    );
  });

  it("não retrocede: lido não volta para entregue", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "lido" });
    await avancarStatusPorWaMessageId("wamid.A", "entregue");
    expect(prismaMock.whatsAppMensagem.update).not.toHaveBeenCalled();
  });

  it("falhou é terminal: não vira entregue", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "falhou" });
    await avancarStatusPorWaMessageId("wamid.A", "entregue");
    expect(prismaMock.whatsAppMensagem.update).not.toHaveBeenCalled();
  });

  it("falhou sempre pode ser aplicado sobre enviado", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "enviado" });
    await avancarStatusPorWaMessageId("wamid.A", "falhou", { codigo: 131047, msg: "fora da janela" });
    const data = prismaMock.whatsAppMensagem.update.mock.calls[0]![0].data;
    expect(data).toMatchObject({ status: "falhou", erroCodigo: 131047, erroMsg: "fora da janela" });
  });

  it("mensagem inexistente é ignorada sem erro", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue(null);
    await expect(avancarStatusPorWaMessageId("wamid.X", "entregue")).resolves.toBeUndefined();
    expect(prismaMock.whatsAppMensagem.update).not.toHaveBeenCalled();
  });
});

describe("contarContatosUnicos24h", () => {
  it("conta telefones distintos com saída nas últimas 24h", async () => {
    prismaMock.whatsAppMensagem.findMany.mockResolvedValue([
      { telefone: "5592111111111" },
      { telefone: "5592111111111" },
      { telefone: "5592222222222" },
    ]);
    expect(await contarContatosUnicos24h()).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/whatsapp-mensagem.test.ts`
Expected: FAIL — "Cannot find module '@/lib/whatsapp-mensagem'"

- [ ] **Step 3: Implementar**

Criar `src/lib/whatsapp-mensagem.ts`:

```typescript
/**
 * Registro unificado de mensagens WhatsApp.
 *
 * Fonte de verdade do histórico por cliente, do status de entrega e da janela
 * de 24h da Meta. Consumido por `whatsapp.ts` (saídas) e pelo webhook
 * `/api/webhooks/meta-whatsapp` (entradas e callbacks de status).
 */
import { prisma } from "@/lib/db";

export type OrigemMensagem =
  | "cron"
  | "campanha"
  | "venda"
  | "boleto"
  | "relatorio"
  | "pre_atendimento"
  | "manual";

export type StatusMensagem = "pendente" | "enviado" | "entregue" | "lido" | "falhou";

/** Progressão permitida. O status nunca retrocede; `falhou` é terminal. */
const ORDEM: Record<StatusMensagem, number> = {
  pendente: 0,
  enviado: 1,
  entregue: 2,
  lido: 3,
  falhou: 99,
};

const JANELA_MS = 24 * 60 * 60 * 1000;

export type RegistroSaida = {
  telefone: string;
  clienteId?: number | null;
  origem: OrigemMensagem;
  templateNome?: string | null;
  corpo: string;
};

export type RegistroEntrada = {
  telefone: string;
  clienteId?: number | null;
  waMessageId?: string | null;
  corpo: string;
};

/** Há mensagem recebida deste número nas últimas 24h? */
export async function dentroDaJanela24h(telefone: string): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_MS);
  const ultima = await prisma.whatsAppMensagem.findFirst({
    where: { telefone, direcao: "in", criadoEm: { gte: desde } },
    select: { id: true },
    orderBy: { criadoEm: "desc" },
  });
  return ultima !== null;
}

/** Registra uma saída como `pendente` e devolve o id para atualização posterior. */
export async function registrarSaida(input: RegistroSaida): Promise<number> {
  const msg = await prisma.whatsAppMensagem.create({
    data: {
      telefone: input.telefone,
      clienteId: input.clienteId ?? null,
      direcao: "out",
      origem: input.origem,
      templateNome: input.templateNome ?? null,
      corpo: input.corpo,
      status: "pendente",
    },
    select: { id: true },
  });
  return msg.id;
}

export async function marcarEnviada(id: number, waMessageId?: string): Promise<void> {
  await prisma.whatsAppMensagem.update({
    where: { id },
    data: { status: "enviado", waMessageId: waMessageId ?? null },
  });
}

export async function marcarFalha(id: number, erroMsg: string, erroCodigo?: number): Promise<void> {
  await prisma.whatsAppMensagem.update({
    where: { id },
    data: { status: "falhou", erroMsg, erroCodigo: erroCodigo ?? null },
  });
}

/**
 * Registra uma mensagem recebida. Idempotente por `waMessageId`: reentrega da
 * Meta não duplica o registro nem faz a IA responder duas vezes.
 * Devolve true se a mensagem é nova (deve ser processada).
 */
export async function registrarEntrada(input: RegistroEntrada): Promise<boolean> {
  if (input.waMessageId) {
    const existente = await prisma.whatsAppMensagem.findUnique({
      where: { waMessageId: input.waMessageId },
      select: { id: true },
    });
    if (existente) return false;
  }
  await prisma.whatsAppMensagem.create({
    data: {
      telefone: input.telefone,
      clienteId: input.clienteId ?? null,
      direcao: "in",
      origem: "pre_atendimento",
      waMessageId: input.waMessageId ?? null,
      corpo: input.corpo,
      status: "entregue",
    },
  });
  return true;
}

/**
 * Avança o status a partir de um callback da Meta. Ignora silenciosamente
 * quando a mensagem ainda não foi gravada (corrida) ou quando o status
 * receberia um retrocesso (callbacks chegam fora de ordem).
 */
export async function avancarStatusPorWaMessageId(
  waMessageId: string,
  novo: StatusMensagem,
  erro?: { codigo?: number; msg?: string }
): Promise<void> {
  const atual = await prisma.whatsAppMensagem.findFirst({
    where: { waMessageId },
    select: { id: true, status: true },
  });
  if (!atual) return;

  const statusAtual = atual.status as StatusMensagem;
  if (statusAtual === "falhou") return;
  if (ORDEM[novo] <= ORDEM[statusAtual]) return;

  await prisma.whatsAppMensagem.update({
    where: { id: atual.id },
    data: {
      status: novo,
      ...(erro?.codigo !== undefined ? { erroCodigo: erro.codigo } : {}),
      ...(erro?.msg !== undefined ? { erroMsg: erro.msg } : {}),
    },
  });
}

/**
 * Quantos números distintos receberam mensagem nas últimas 24h.
 * Usado para respeitar o messaging tier da Meta antes de disparar campanha.
 */
export async function contarContatosUnicos24h(): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MS);
  const linhas = await prisma.whatsAppMensagem.findMany({
    where: { direcao: "out", criadoEm: { gte: desde }, status: { not: "falhou" } },
    select: { telefone: true },
  });
  return new Set(linhas.map((l) => l.telefone)).size;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/whatsapp-mensagem.test.ts`
Expected: PASS — 12 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp-mensagem.ts src/__tests__/whatsapp-mensagem.test.ts
git commit -m "feat(whatsapp): camada de registro de mensagens e janela de 24h"
```

---

### Task 3: Camada de envio com decisão texto-vs-template

**Files:**
- Modify: `src/lib/whatsapp.ts`
- Test: `src/__tests__/whatsapp-envio.test.ts`

**Interfaces:**
- Consumes: `registrarSaida`, `marcarEnviada`, `marcarFalha`, `dentroDaJanela24h` (Task 2); `resolveWhatsAppProviders` e `WhatsAppTemplate` (`@/lib/whatsapp-provider`, existentes)
- Produces:
  - `type EnvioWhatsApp = { telefone: string | null | undefined; clienteId?: number | null; origem: OrigemMensagem; template: WhatsAppTemplate }`
  - `enviarWhatsAppDetalhado(input: EnvioWhatsApp): Promise<{ ok: boolean; mensagemId: number | null }>` — usado pela Task 10 para gravar `CampanhaEnvio.mensagemId`
  - `enviarWhatsApp(input: EnvioWhatsApp): Promise<boolean>` — invólucro fino sobre o anterior, para quem só quer saber se deu certo
  - `enviarWhatsAppTexto`, `enviarWhatsAppArquivo`, `enviarWhatsAppTemplate` seguem exportados com a mesma assinatura (nenhum call site quebra nesta task)

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/whatsapp-envio.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mensagemMock = {
  dentroDaJanela24h: vi.fn(),
  registrarSaida: vi.fn(),
  marcarEnviada: vi.fn(),
  marcarFalha: vi.fn(),
};
const providerMock = { resolveWhatsAppProviders: vi.fn() };

vi.mock("@/lib/whatsapp-mensagem", () => mensagemMock);
vi.mock("@/lib/whatsapp-provider", () => providerMock);
vi.mock("@/lib/db", () => ({ prisma: { config: { findFirst: vi.fn().mockResolvedValue(null) } } }));

const { enviarWhatsApp } = await import("@/lib/whatsapp");

const template = {
  name: "bfx_aniversario",
  language: "pt_BR",
  bodyParams: ["João"],
  fallbackText: "Parabéns, João!",
};

let sendText: ReturnType<typeof vi.fn>;
let sendTemplate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  sendText = vi.fn().mockResolvedValue({ ok: true, messageId: "wamid.T", provider: "meta_cloud" });
  sendTemplate = vi.fn().mockResolvedValue({ ok: true, messageId: "wamid.P", provider: "meta_cloud" });
  providerMock.resolveWhatsAppProviders.mockResolvedValue({
    primary: { name: "meta_cloud", sendText, sendTemplate, sendDocument: vi.fn() },
    fallback: null,
    providerName: "meta_cloud",
  });
  mensagemMock.registrarSaida.mockResolvedValue(99);
});

describe("enviarWhatsApp", () => {
  it("dentro da janela de 24h envia texto livre", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(true);
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(true);
    expect(sendText).toHaveBeenCalledWith("5592999999999", "Parabéns, João!");
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it("fora da janela envia o template aprovado", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(true);
    expect(sendTemplate).toHaveBeenCalledWith("5592999999999", template);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("registra a saída e marca como enviada com o waMessageId", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    await enviarWhatsApp({ telefone: "92999999999", clienteId: 7, origem: "cron", template });
    expect(mensagemMock.registrarSaida).toHaveBeenCalledWith(
      expect.objectContaining({
        telefone: "5592999999999",
        clienteId: 7,
        origem: "cron",
        templateNome: "bfx_aniversario",
        corpo: "Parabéns, João!",
      })
    );
    expect(mensagemMock.marcarEnviada).toHaveBeenCalledWith(99, "wamid.P");
  });

  it("texto livre registra templateNome null", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(true);
    await enviarWhatsApp({ telefone: "92999999999", origem: "pre_atendimento", template });
    expect(mensagemMock.registrarSaida).toHaveBeenCalledWith(
      expect.objectContaining({ templateNome: null })
    );
  });

  it("fora da janela e sem template aplicável falha com janela_expirada", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    const ok = await enviarWhatsApp({
      telefone: "92999999999",
      origem: "pre_atendimento",
      template: { ...template, name: "" },
    });
    expect(ok).toBe(false);
    expect(sendTemplate).not.toHaveBeenCalled();
    expect(sendText).not.toHaveBeenCalled();
    expect(mensagemMock.marcarFalha).toHaveBeenCalledWith(99, "janela_expirada");
  });

  it("falha do provider marca falha na mensagem", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    sendTemplate.mockResolvedValue({ ok: false, error: "Invalid token", provider: "meta_cloud" });
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(false);
    expect(mensagemMock.marcarFalha).toHaveBeenCalledWith(99, "Invalid token");
  });

  it("telefone inválido não registra nada", async () => {
    const ok = await enviarWhatsApp({ telefone: "123", origem: "cron", template });
    expect(ok).toBe(false);
    expect(mensagemMock.registrarSaida).not.toHaveBeenCalled();
  });

  it("sem provider configurado marca falha", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    providerMock.resolveWhatsAppProviders.mockResolvedValue({
      primary: null,
      fallback: null,
      providerName: "meta_cloud",
    });
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(false);
    expect(mensagemMock.marcarFalha).toHaveBeenCalledWith(99, "provider_nao_configurado");
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/whatsapp-envio.test.ts`
Expected: FAIL — `enviarWhatsApp is not a function`

- [ ] **Step 3: Implementar `enviarWhatsApp`**

Em `src/lib/whatsapp.ts`, ajustar os imports do topo para:

```typescript
import { prisma } from "@/lib/db";
import {
  resolveWhatsAppProviders,
  type WhatsAppTemplate,
} from "@/lib/whatsapp-provider";
import {
  registrarSaida,
  marcarEnviada,
  marcarFalha,
  dentroDaJanela24h,
  type OrigemMensagem,
} from "@/lib/whatsapp-mensagem";
```

E adicionar ao fim do arquivo:

```typescript
export type EnvioWhatsApp = {
  telefone: string | null | undefined;
  clienteId?: number | null;
  origem: OrigemMensagem;
  template: WhatsAppTemplate;
};

/**
 * Ponto de entrada único de envio.
 *
 * Dentro da janela de 24h (houve inbound do cliente) envia texto livre, que é
 * mais barato e é o único formato que comporta resposta gerada por IA. Fora da
 * janela, a Meta só aceita template aprovado. Todo envio é registrado em
 * `WhatsAppMensagem` antes da chamada, para que o callback de status tenha onde
 * pousar.
 */
export async function enviarWhatsAppDetalhado(
  input: EnvioWhatsApp
): Promise<{ ok: boolean; mensagemId: number | null }> {
  const numero = normalizarTelefone(input.telefone);
  if (!numero) return { ok: false, mensagemId: null };

  const naJanela = await dentroDaJanela24h(numero);
  const usaTemplate = !naJanela;
  const corpo = input.template.fallbackText;

  const mensagemId = await registrarSaida({
    telefone: numero,
    clienteId: input.clienteId ?? null,
    origem: input.origem,
    templateNome: usaTemplate ? input.template.name : null,
    corpo,
  });

  if (usaTemplate && !input.template.name) {
    await marcarFalha(mensagemId, "janela_expirada");
    return { ok: false, mensagemId };
  }

  const { primary } = await resolveWhatsAppProviders();
  if (!primary) {
    await marcarFalha(mensagemId, "provider_nao_configurado");
    return { ok: false, mensagemId };
  }

  const resultado = usaTemplate
    ? await primary.sendTemplate(numero, input.template)
    : await primary.sendText(numero, corpo);

  if (resultado.ok) {
    await marcarEnviada(mensagemId, resultado.messageId);
    return { ok: true, mensagemId };
  }
  await marcarFalha(mensagemId, resultado.error || "erro_desconhecido");
  return { ok: false, mensagemId };
}

/** Invólucro para quem só precisa saber se o envio deu certo. */
export async function enviarWhatsApp(input: EnvioWhatsApp): Promise<boolean> {
  const { ok } = await enviarWhatsAppDetalhado(input);
  return ok;
}
```

As funções `enviarWhatsAppTexto`, `enviarWhatsAppArquivo` e `enviarWhatsAppTemplate` **não são alteradas nesta task** — os call sites migram na Task 7.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/whatsapp-envio.test.ts`
Expected: PASS — 8 testes.

- [ ] **Step 5: Garantir que os testes existentes seguem verdes**

Run: `yarn test`
Expected: PASS em todos os arquivos, incluindo `whatsapp-provider.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/whatsapp.ts src/__tests__/whatsapp-envio.test.ts
git commit -m "feat(whatsapp): enviarWhatsApp com regra de janela de 24h e registro"
```

---

### Task 4: Verificação de assinatura do webhook

**Files:**
- Create: `src/lib/meta-webhook-signature.ts`
- Test: `src/__tests__/meta-webhook-signature.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `verificarAssinaturaMeta(rawBody: string, header: string | null | undefined, appSecret: string): boolean`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/meta-webhook-signature.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verificarAssinaturaMeta } from "@/lib/meta-webhook-signature";

const SECRET = "app-secret-123";
const body = JSON.stringify({ entry: [{ id: "1" }] });
const assinaturaValida = "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");

describe("verificarAssinaturaMeta", () => {
  it("aceita assinatura válida", () => {
    expect(verificarAssinaturaMeta(body, assinaturaValida, SECRET)).toBe(true);
  });

  it("rejeita corpo adulterado", () => {
    const adulterado = JSON.stringify({ entry: [{ id: "2" }] });
    expect(verificarAssinaturaMeta(adulterado, assinaturaValida, SECRET)).toBe(false);
  });

  it("rejeita segredo errado", () => {
    expect(verificarAssinaturaMeta(body, assinaturaValida, "outro")).toBe(false);
  });

  it("rejeita header ausente", () => {
    expect(verificarAssinaturaMeta(body, null, SECRET)).toBe(false);
    expect(verificarAssinaturaMeta(body, undefined, SECRET)).toBe(false);
    expect(verificarAssinaturaMeta(body, "", SECRET)).toBe(false);
  });

  it("rejeita header sem o prefixo sha256=", () => {
    const semPrefixo = createHmac("sha256", SECRET).update(body).digest("hex");
    expect(verificarAssinaturaMeta(body, semPrefixo, SECRET)).toBe(false);
  });

  it("rejeita hex de tamanho diferente sem lançar", () => {
    expect(verificarAssinaturaMeta(body, "sha256=abcd", SECRET)).toBe(false);
  });

  it("rejeita quando o appSecret está vazio", () => {
    expect(verificarAssinaturaMeta(body, assinaturaValida, "")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/meta-webhook-signature.test.ts`
Expected: FAIL — "Cannot find module '@/lib/meta-webhook-signature'"

- [ ] **Step 3: Implementar**

Criar `src/lib/meta-webhook-signature.ts`:

```typescript
/**
 * Verificação do header `X-Hub-Signature-256` dos webhooks da Meta.
 *
 * O HMAC é calculado sobre os bytes exatos que a Meta enviou — o handler
 * precisa ler `await req.text()` e validar ANTES de qualquer parse; fazer
 * `req.json()` e re-serializar quebra a assinatura.
 *
 * Isto é a única barreira de autenticação da rota: `/api/webhooks` é isento do
 * middleware de sessão (ver `src/middleware.ts`).
 */
import { createHmac, timingSafeEqual } from "crypto";

const PREFIXO = "sha256=";

export function verificarAssinaturaMeta(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string
): boolean {
  if (!header || !appSecret) return false;
  if (!header.startsWith(PREFIXO)) return false;

  const recebida = header.slice(PREFIXO.length);
  const esperada = createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const bufRecebida = Buffer.from(recebida, "hex");
  const bufEsperada = Buffer.from(esperada, "hex");
  // timingSafeEqual lança se os tamanhos diferem — compara antes.
  if (bufRecebida.length !== bufEsperada.length) return false;

  return timingSafeEqual(bufRecebida, bufEsperada);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/meta-webhook-signature.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/meta-webhook-signature.ts src/__tests__/meta-webhook-signature.test.ts
git commit -m "feat(whatsapp): verificacao de assinatura X-Hub-Signature-256"
```

---

### Task 5: Webhook — assinatura, inbound persistido e callbacks de status

**Files:**
- Modify: `src/app/api/webhooks/meta-whatsapp/route.ts`
- Create: `src/lib/meta-webhook-payload.ts`
- Test: `src/__tests__/meta-webhook-payload.test.ts`

**Interfaces:**
- Consumes: `verificarAssinaturaMeta` (Task 4); `registrarEntrada`, `avancarStatusPorWaMessageId` (Task 2)
- Produces:
  - `type InboundMeta = { telefone: string; texto: string; nome?: string; waMessageId?: string }`
  - `type StatusMeta = { waMessageId: string; status: StatusMensagem; erroCodigo?: number; erroMsg?: string }`
  - `extrairMensagens(body: unknown): InboundMeta[]`
  - `extrairStatuses(body: unknown): StatusMeta[]`

A extração sai da rota para um módulo próprio porque passa a ter duas formas e regras de mapeamento que merecem teste isolado.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/meta-webhook-payload.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extrairMensagens, extrairStatuses } from "@/lib/meta-webhook-payload";

const payloadMensagem = {
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "5592999999999", profile: { name: "João" } }],
            messages: [
              { from: "5592999999999", id: "wamid.A", type: "text", text: { body: "oi" } },
            ],
          },
        },
      ],
    },
  ],
};

const payloadStatus = {
  entry: [
    {
      changes: [
        {
          value: {
            statuses: [
              { id: "wamid.A", status: "delivered", timestamp: "1700000000" },
              {
                id: "wamid.B",
                status: "failed",
                errors: [{ code: 131047, title: "Re-engagement message" }],
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("extrairMensagens", () => {
  it("extrai telefone, texto, nome e waMessageId", () => {
    expect(extrairMensagens(payloadMensagem)).toEqual([
      { telefone: "5592999999999", texto: "oi", nome: "João", waMessageId: "wamid.A" },
    ]);
  });

  it("ignora mensagens que não são texto", () => {
    const p = {
      entry: [
        { changes: [{ value: { messages: [{ from: "559299", id: "x", type: "image" }] } }] },
      ],
    };
    expect(extrairMensagens(p)).toEqual([]);
  });

  it("tolera payload malformado", () => {
    expect(extrairMensagens(null)).toEqual([]);
    expect(extrairMensagens({})).toEqual([]);
    expect(extrairMensagens({ entry: "nao-array" })).toEqual([]);
  });
});

describe("extrairStatuses", () => {
  it("mapeia os status da Meta para os internos", () => {
    const out = extrairStatuses(payloadStatus);
    expect(out[0]).toEqual({ waMessageId: "wamid.A", status: "entregue" });
    expect(out[1]).toMatchObject({
      waMessageId: "wamid.B",
      status: "falhou",
      erroCodigo: 131047,
    });
  });

  it("mapeia sent e read", () => {
    const p = {
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "1", status: "sent" }, { id: "2", status: "read" }] } },
          ],
        },
      ],
    };
    const out = extrairStatuses(p);
    expect(out[0]!.status).toBe("enviado");
    expect(out[1]!.status).toBe("lido");
  });

  it("ignora status desconhecido", () => {
    const p = { entry: [{ changes: [{ value: { statuses: [{ id: "1", status: "xpto" }] } }] }] };
    expect(extrairStatuses(p)).toEqual([]);
  });

  it("tolera payload malformado", () => {
    expect(extrairStatuses(null)).toEqual([]);
    expect(extrairStatuses({ entry: [{}] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/meta-webhook-payload.test.ts`
Expected: FAIL — "Cannot find module '@/lib/meta-webhook-payload'"

- [ ] **Step 3: Implementar o módulo de extração**

Criar `src/lib/meta-webhook-payload.ts`:

```typescript
/**
 * Extração dos payloads do webhook da Meta.
 *
 * Um mesmo POST pode trazer mensagens recebidas (`messages`) ou callbacks de
 * status de entrega (`statuses`). Ambos são tolerantes a payload malformado —
 * a rota nunca deve levantar 5xx por causa de um shape inesperado.
 */
import type { StatusMensagem } from "@/lib/whatsapp-mensagem";

export type InboundMeta = {
  telefone: string;
  texto: string;
  nome?: string;
  waMessageId?: string;
};

export type StatusMeta = {
  waMessageId: string;
  status: StatusMensagem;
  erroCodigo?: number;
  erroMsg?: string;
};

type MetaMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
};

type MetaContact = { profile?: { name?: string }; wa_id?: string };

type MetaStatus = {
  id?: string;
  status?: string;
  errors?: { code?: number; title?: string; message?: string }[];
};

type MetaValue = {
  messages?: MetaMessage[];
  contacts?: MetaContact[];
  statuses?: MetaStatus[];
};

/** Percorre entry[].changes[].value e devolve cada `value` encontrado. */
function valores(body: unknown): MetaValue[] {
  const out: MetaValue[] = [];
  if (!body || typeof body !== "object") return out;
  const entries = (body as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: unknown }).value;
      if (value && typeof value === "object") out.push(value as MetaValue);
    }
  }
  return out;
}

export function extrairMensagens(body: unknown): InboundMeta[] {
  const out: InboundMeta[] = [];
  for (const value of valores(body)) {
    if (!Array.isArray(value.messages)) continue;

    const nomePorWaId = new Map<string, string>();
    for (const c of value.contacts ?? []) {
      if (c.wa_id && c.profile?.name) nomePorWaId.set(c.wa_id, c.profile.name);
    }

    for (const msg of value.messages) {
      if (msg.type !== "text" || !msg.from) continue;
      const texto = msg.text?.body?.trim();
      if (!texto) continue;
      out.push({
        telefone: msg.from,
        texto,
        nome: nomePorWaId.get(msg.from),
        waMessageId: msg.id,
      });
    }
  }
  return out;
}

/** Mapeamento dos status da Meta para os internos. */
const MAPA_STATUS: Record<string, StatusMensagem> = {
  sent: "enviado",
  delivered: "entregue",
  read: "lido",
  failed: "falhou",
};

export function extrairStatuses(body: unknown): StatusMeta[] {
  const out: StatusMeta[] = [];
  for (const value of valores(body)) {
    if (!Array.isArray(value.statuses)) continue;
    for (const s of value.statuses) {
      if (!s.id || !s.status) continue;
      const interno = MAPA_STATUS[s.status];
      if (!interno) continue;

      const erro = s.errors?.[0];
      out.push({
        waMessageId: s.id,
        status: interno,
        ...(erro?.code !== undefined ? { erroCodigo: erro.code } : {}),
        ...(erro?.title || erro?.message
          ? { erroMsg: erro.title || erro.message }
          : {}),
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/meta-webhook-payload.test.ts`
Expected: PASS — 8 testes.

- [ ] **Step 5: Reescrever a rota do webhook**

Substituir todo o conteúdo de `src/app/api/webhooks/meta-whatsapp/route.ts` por:

```typescript
/**
 * Webhook do WhatsApp Business Cloud API (Meta).
 *
 * GET  — handshake de verificação (hub.mode / hub.verify_token / hub.challenge).
 * POST — valida X-Hub-Signature-256, persiste mensagens recebidas, processa
 *        callbacks de status e (se habilitado) aciona o pré-atendimento por IA.
 *
 * A rota é isenta do middleware de sessão (`/api/webhooks`), então a assinatura
 * HMAC é a única barreira de autenticação — sem ela, qualquer um acionaria a IA
 * e provocaria envio de WhatsApp para um número escolhido pelo atacante.
 *
 * Responde sempre 200 (exceto assinatura inválida → 401): 5xx faz a Meta
 * reentregar com backoff e, com falhas repetidas, desativar a inscrição.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processarMensagemRecebida } from "@/lib/whatsapp-pre-atendimento";
import { verificarAssinaturaMeta } from "@/lib/meta-webhook-signature";
import { extrairMensagens, extrairStatuses } from "@/lib/meta-webhook-payload";
import { registrarEntrada, avancarStatusPorWaMessageId } from "@/lib/whatsapp-mensagem";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const cfg = await prisma.config.findFirst();
  const rawToken = (cfg as Record<string, unknown> | null)?.metaWebhookVerifyToken;
  const verifyToken =
    (typeof rawToken === "string" ? rawToken.trim() : "") ||
    process.env.META_WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verificação inválida" }, { status: 403 });
}

export async function POST(req: Request) {
  // Lê o corpo cru UMA vez: o HMAC é sobre os bytes exatos enviados pela Meta.
  const rawBody = await req.text();

  const cfg = await prisma.config.findFirst();
  const appSecret =
    ((cfg as Record<string, unknown> | null)?.metaAppSecret as string | undefined)?.trim() ||
    process.env.META_APP_SECRET?.trim() ||
    "";

  const assinatura = req.headers.get("x-hub-signature-256");
  if (!verificarAssinaturaMeta(rawBody, assinatura, appSecret)) {
    console.warn("[Webhook Meta] Assinatura inválida — payload descartado");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as unknown;

    // Callbacks de status: avançam o estado da mensagem já registrada.
    for (const s of extrairStatuses(body)) {
      await avancarStatusPorWaMessageId(s.waMessageId, s.status, {
        codigo: s.erroCodigo,
        msg: s.erroMsg,
      });
    }

    // Mensagens recebidas: persistidas SEMPRE — alimentam a janela de 24h e o
    // histórico, independentemente de o pré-atendimento estar ligado.
    const preAtendimentoAtivo = cfg?.whatsappPreAtendimento === 1;
    for (const m of extrairMensagens(body)) {
      const nova = await registrarEntrada({
        telefone: m.telefone,
        waMessageId: m.waMessageId,
        corpo: m.texto,
      });
      // `nova === false` é reentrega da Meta: não responder duas vezes.
      if (nova && preAtendimentoAtivo) {
        void processarMensagemRecebida(m.telefone, m.texto, m.nome);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Meta]", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
```

- [ ] **Step 6: Verificar tipos e suíte completa**

Run: `yarn tsc --noEmit -p tsconfig.json && yarn test`
Expected: sem erros de tipo; todos os testes PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/meta-webhook-payload.ts src/__tests__/meta-webhook-payload.test.ts src/app/api/webhooks/meta-whatsapp/route.ts
git commit -m "feat(whatsapp): webhook valida assinatura, persiste inbound e status"
```

---

### Task 6: Templates novos e migração dos call sites de texto livre

**Files:**
- Modify: `src/lib/whatsapp-templates.ts`
- Modify: `src/app/(app)/venda-rapida/actions.ts:503,512`
- Modify: `src/lib/boleto-actions.ts:96`
- Modify: `src/lib/relatorio-mensal-service.ts:205`
- Modify: `src/lib/email.ts:427,494,520`
- Modify: `src/lib/whatsapp-pre-atendimento.ts:189`
- Test: `src/__tests__/whatsapp-templates.test.ts`

**Interfaces:**
- Consumes: `enviarWhatsApp`, `EnvioWhatsApp` (Task 3); `comFallback` (existente)
- Produces: `TEMPLATES.recibo`, `TEMPLATES.boleto`, `TEMPLATES.relatorioEmpresa` adicionados ao registry existente

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/whatsapp-templates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TEMPLATES, comFallback } from "@/lib/whatsapp-templates";

describe("TEMPLATES", () => {
  it("cobre os 10 templates transacionais", () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(
      [
        "agradecimento",
        "aniversario",
        "boasVindas",
        "boleto",
        "lembreteParcela",
        "nps",
        "parcelaVencida",
        "reativacao",
        "recibo",
        "relatorioEmpresa",
      ].sort()
    );
  });

  it("todos os nomes usam o prefixo bfx_", () => {
    for (const nome of Object.values(TEMPLATES)) {
      expect(nome.startsWith("bfx_")).toBe(true);
    }
  });

  it("nomes são únicos", () => {
    const nomes = Object.values(TEMPLATES);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});

describe("comFallback", () => {
  it("monta o template com idioma, params e fallbackText", () => {
    const t = comFallback(TEMPLATES.recibo, ["João", "http://x/r.pdf"], "Olá João, seu recibo: http://x/r.pdf");
    expect(t).toMatchObject({
      name: "bfx_recibo",
      bodyParams: ["João", "http://x/r.pdf"],
      fallbackText: "Olá João, seu recibo: http://x/r.pdf",
    });
    expect(t.language).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/whatsapp-templates.test.ts`
Expected: FAIL — o array de chaves não bate (faltam `recibo`, `boleto`, `relatorioEmpresa`).

- [ ] **Step 3: Adicionar os templates ao registry**

Em `src/lib/whatsapp-templates.ts`, substituir o objeto `TEMPLATES` por:

```typescript
export const TEMPLATES = {
  lembreteParcela: "bfx_lembrete_parcela",
  parcelaVencida: "bfx_parcela_vencida",
  aniversario: "bfx_aniversario",
  agradecimento: "bfx_agradecimento",
  nps: "bfx_nps",
  reativacao: "bfx_reativacao",
  boasVindas: "bfx_boas_vindas",
  recibo: "bfx_recibo",
  boleto: "bfx_boleto",
  relatorioEmpresa: "bfx_relatorio_empresa",
} as const;
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/whatsapp-templates.test.ts`
Expected: PASS — 4 testes.

- [ ] **Step 5: Migrar venda-rápida**

Em `src/app/(app)/venda-rapida/actions.ts`, trocar o import da linha 18:

```typescript
import { enviarWhatsApp, getWhatsAppConfig } from "@/lib/whatsapp";
import { TEMPLATES, comFallback } from "@/lib/whatsapp-templates";
```

Na linha ~503, substituir `if (mensagem) void enviarWhatsAppTexto(cliente.telefone, mensagem);` por:

```typescript
        if (mensagem) {
          void enviarWhatsApp({
            telefone: cliente.telefone,
            clienteId: cliente.id,
            origem: "venda",
            template: comFallback(TEMPLATES.recibo, [cliente.nome], mensagem),
          });
        }
```

Na linha ~512, substituir `void enviarWhatsAppTexto(cliente.telefone, msgBoasVindas);` por:

```typescript
            void enviarWhatsApp({
              telefone: cliente.telefone,
              clienteId: cliente.id,
              origem: "venda",
              template: comFallback(TEMPLATES.boasVindas, [cliente.nome], msgBoasVindas),
            });
```

- [ ] **Step 6: Migrar boletos**

Em `src/lib/boleto-actions.ts`, trocar o import da linha 10:

```typescript
import { enviarWhatsApp, getWhatsAppConfig } from "@/lib/whatsapp";
import { TEMPLATES, comFallback } from "@/lib/whatsapp-templates";
```

Na linha ~96, substituir `void enviarWhatsAppTexto(cliente.telefone, msg);` por:

```typescript
      void enviarWhatsApp({
        telefone: cliente.telefone,
        clienteId: cliente.id,
        origem: "boleto",
        template: comFallback(TEMPLATES.boleto, [cliente.nome], msg),
      });
```

- [ ] **Step 7: Migrar relatórios e e-mail**

Em `src/lib/relatorio-mensal-service.ts` (linha 13 e ~205) e `src/lib/email.ts` (linha 14 e ~427, ~494, ~520), trocar o import de `enviarWhatsAppTexto` para:

```typescript
import { enviarWhatsApp } from "@/lib/whatsapp";
import { TEMPLATES, comFallback } from "@/lib/whatsapp-templates";
```

E cada chamada `await enviarWhatsAppTexto(<telefone>, <mensagem>)` por:

```typescript
await enviarWhatsApp({
  telefone: <telefone>,
  origem: "relatorio",
  template: comFallback(TEMPLATES.relatorioEmpresa, [<mensagem>], <mensagem>),
});
```

Estes destinos são telefones de RH de empresa parceira, não clientes — por isso `clienteId` fica ausente. O template `bfx_relatorio_empresa` tem uma única variável de corpo, que recebe o texto do aviso.

- [ ] **Step 8: Migrar o pré-atendimento**

Em `src/lib/whatsapp-pre-atendimento.ts`, trocar o import da linha 7:

```typescript
import { enviarWhatsApp } from "@/lib/whatsapp";
```

E, na linha ~189, substituir a chamada por:

```typescript
    const textoResposta = resposta || `Olá, ${nome}! Como posso ajudar?`;
    const enviado = await enviarWhatsApp({
      telefone,
      clienteId: cliente?.id ?? null,
      origem: "pre_atendimento",
      // Sem template: resposta de IA é conteúdo arbitrário e só pode sair
      // dentro da janela de 24h. Fora dela, `enviarWhatsApp` marca a mensagem
      // como falhou com motivo `janela_expirada`.
      template: { name: "", language: "pt_BR", bodyParams: [], fallbackText: textoResposta },
    });
```

- [ ] **Step 9: Verificar que nenhum call site de texto livre sobrou**

Run: `yarn tsc --noEmit -p tsconfig.json`
Expected: sem erros.

Run: `grep -rn "enviarWhatsAppTexto" src --include=*.ts --include=*.tsx | grep -v "src/lib/whatsapp.ts"`
Expected: apenas `src/lib/campanha-service.ts` (migrado na Task 8) e comentários em `src/lib/providers/whatsapp-evolution.ts`.

- [ ] **Step 10: Rodar a suíte completa**

Run: `yarn test`
Expected: todos PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/whatsapp-templates.ts src/__tests__/whatsapp-templates.test.ts src/app/\(app\)/venda-rapida/actions.ts src/lib/boleto-actions.ts src/lib/relatorio-mensal-service.ts src/lib/email.ts src/lib/whatsapp-pre-atendimento.ts
git commit -m "feat(whatsapp): migra call sites de texto livre para template"
```

---

### Task 7: Separar `getWhatsAppFlags` de `getWhatsAppConfig`

**Files:**
- Modify: `src/lib/whatsapp.ts`
- Modify: `src/app/api/cron/agradecimento-pos-venda/route.ts`, `aniversario/route.ts`, `lembrete-parcelas/route.ts`, `parcela-vencida/route.ts`, `pesquisa-satisfacao/route.ts`, `reativacao-inativos/route.ts` (todos em `src/app/api/cron/`)
- Modify: `src/app/(app)/venda-rapida/actions.ts`, `src/lib/boleto-actions.ts`
- Test: `src/__tests__/whatsapp-flags.test.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: `getWhatsAppFlags(): Promise<WhatsAppFlags | null>`, onde `WhatsAppFlags` tem os campos `enabled`, `autoRecibo`, `autoBoleto`, `autoLembrete`, `autoReativacao`, `autoAniversario`, `autoInadimplencia`, `autoNPS`, `autoBoasVindas`, `autoAgradecimento`, `diasInativo`. `getWhatsAppConfig` é removida.

Motivo: `getWhatsAppConfig` devolve dados de conexão da Evolution (`baseUrl`, `apiKey`, `instance`) junto das flags, e retorna `null` quando a Evolution não está configurada. Com a Evolution fora, isso desligaria todos os crons.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/whatsapp-flags.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const configMock = { findFirst: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: { config: configMock } }));

const { getWhatsAppFlags } = await import("@/lib/whatsapp");

beforeEach(() => vi.clearAllMocks());

describe("getWhatsAppFlags", () => {
  it("não depende de configuração da Evolution", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1 });
    const flags = await getWhatsAppFlags();
    expect(flags).not.toBeNull();
    expect(flags!.enabled).toBe(true);
  });

  it("devolve null quando o master switch está desligado", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 0 });
    expect(await getWhatsAppFlags()).toBeNull();
  });

  it("aplica os padrões: recibo/boleto/lembrete ligados, resto desligado", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1 });
    const flags = (await getWhatsAppFlags())!;
    expect(flags.autoRecibo).toBe(true);
    expect(flags.autoBoleto).toBe(true);
    expect(flags.autoLembrete).toBe(true);
    expect(flags.autoAniversario).toBe(false);
    expect(flags.autoNPS).toBe(false);
    expect(flags.diasInativo).toBe(60);
  });

  it("respeita diasInativo customizado", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1, whatsappDiasInativo: 90 });
    expect((await getWhatsAppFlags())!.diasInativo).toBe(90);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/whatsapp-flags.test.ts`
Expected: FAIL — `getWhatsAppFlags is not a function`

- [ ] **Step 3: Substituir `getWhatsAppConfig` por `getWhatsAppFlags`**

Em `src/lib/whatsapp.ts`, remover o tipo `WhatsAppConfig` e a função `getWhatsAppConfig` inteiros (linhas 17–75) e pôr no lugar:

```typescript
export type WhatsAppFlags = {
  enabled: boolean;
  autoRecibo: boolean;
  autoBoleto: boolean;
  autoLembrete: boolean;
  autoReativacao: boolean;
  autoAniversario: boolean;
  autoInadimplencia: boolean;
  autoNPS: boolean;
  autoBoasVindas: boolean;
  autoAgradecimento: boolean;
  diasInativo: number;
};

/**
 * Flags de automação do WhatsApp. Devolve null quando o master switch está
 * desligado — os crons usam isso para sair cedo.
 *
 * Não carrega dados de conexão: a resolução de provider vive inteiramente em
 * `whatsapp-provider.ts`.
 */
export async function getWhatsAppFlags(): Promise<WhatsAppFlags | null> {
  const cfg = await prisma.config.findFirst();
  const enabled =
    cfg?.whatsappAutoEnabled !== undefined && cfg?.whatsappAutoEnabled !== null
      ? cfg.whatsappAutoEnabled === 1
      : process.env.WHATSAPP_AUTO_ENABLED !== "0";
  if (!enabled) return null;

  return {
    enabled,
    autoRecibo: cfg?.whatsappAutoRecibo !== 0,
    autoBoleto: cfg?.whatsappAutoBoleto !== 0,
    autoLembrete: cfg?.whatsappAutoLembrete !== 0,
    autoReativacao: cfg?.whatsappAutoReativacao === 1,
    autoAniversario: cfg?.whatsappAutoAniversario === 1,
    autoInadimplencia: cfg?.whatsappAutoInadimplencia === 1,
    autoNPS: cfg?.whatsappAutoNPS === 1,
    autoBoasVindas: cfg?.whatsappAutoBoasVindas === 1,
    autoAgradecimento: cfg?.whatsappAutoAgradecimento === 1,
    diasInativo: cfg?.whatsappDiasInativo ?? 60,
  };
}
```

- [ ] **Step 4: Atualizar todos os consumidores**

Em cada um dos 8 arquivos listados em **Files**, trocar `getWhatsAppConfig` por `getWhatsAppFlags` no import e na chamada. O padrão nos crons é `const cfg = await getWhatsAppConfig(); if (!cfg || !cfg.autoX) return ...` — só o nome da função muda; os campos `autoX` e `diasInativo` continuam iguais.

Run: `grep -rn "getWhatsAppConfig" src`
Expected: nenhum resultado.

- [ ] **Step 5: Rodar testes e tipos**

Run: `yarn tsc --noEmit -p tsconfig.json && yarn test`
Expected: sem erros de tipo; todos os testes PASS (incluindo os 4 novos).

- [ ] **Step 6: Commit**

```bash
git add src/lib/whatsapp.ts src/__tests__/whatsapp-flags.test.ts src/app/api/cron src/app/\(app\)/venda-rapida/actions.ts src/lib/boleto-actions.ts
git commit -m "refactor(whatsapp): separa flags de automacao da config de conexao"
```

---

### Task 8: Cota de messaging tier no envio de campanhas

**Files:**
- Modify: `src/lib/campanha-service.ts`
- Test: `src/__tests__/campanha-cota.test.ts`

**Interfaces:**
- Consumes: `contarContatosUnicos24h` (Task 2)
- Produces:
  - `LIMITE_TIER_24H = 1000`, `RESERVA_TRANSACIONAL = 150`
  - `verificarCota(alvo: number): Promise<{ cabe: boolean; disponivel: number; usados: number }>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/campanha-cota.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mensagemMock = { contarContatosUnicos24h: vi.fn() };
vi.mock("@/lib/whatsapp-mensagem", () => mensagemMock);
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/crm", () => ({ buildClienteSegmentWhere: vi.fn(() => ({})) }));
// Nesta task `campanha-service` ainda importa `enviarWhatsAppTexto` — a troca
// para `enviarWhatsApp` acontece na Task 10. Ambos são mockados para que o
// módulo carregue em qualquer uma das duas ordens de execução.
vi.mock("@/lib/whatsapp", () => ({
  enviarWhatsAppTexto: vi.fn(),
  enviarWhatsApp: vi.fn(),
  enviarWhatsAppDetalhado: vi.fn(),
}));
vi.mock("@/lib/whatsapp-templates", () => ({ comFallback: vi.fn(), TEMPLATES: {} }));
vi.mock("@/lib/logger", () => ({ logCron: vi.fn() }));

const { verificarCota, LIMITE_TIER_24H, RESERVA_TRANSACIONAL } = await import(
  "@/lib/campanha-service"
);

beforeEach(() => vi.clearAllMocks());

describe("verificarCota", () => {
  it("campanha pequena com pouco uso cabe", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(50);
    const r = await verificarCota(100);
    expect(r.cabe).toBe(true);
    expect(r.usados).toBe(50);
    expect(r.disponivel).toBe(LIMITE_TIER_24H - RESERVA_TRANSACIONAL - 50);
  });

  it("reserva transacional é preservada", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(0);
    const r = await verificarCota(LIMITE_TIER_24H);
    expect(r.cabe).toBe(false);
    expect(r.disponivel).toBe(LIMITE_TIER_24H - RESERVA_TRANSACIONAL);
  });

  it("campanha que estoura o restante não cabe", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(800);
    const r = await verificarCota(100);
    expect(r.cabe).toBe(false);
  });

  it("disponível nunca é negativo", async () => {
    mensagemMock.contarContatosUnicos24h.mockResolvedValue(5000);
    const r = await verificarCota(1);
    expect(r.disponivel).toBe(0);
    expect(r.cabe).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/campanha-cota.test.ts`
Expected: FAIL — `verificarCota is not a function`

- [ ] **Step 3: Implementar a cota**

Em `src/lib/campanha-service.ts`, adicionar após `const MAX_ALVO = 1000;`:

```typescript
/**
 * Teto de clientes únicos contatados por 24h no messaging tier inicial da Meta.
 * O limite é COMPARTILHADO com os envios transacionais (lembrete de parcela,
 * cobrança, aniversário) — por isso a reserva abaixo.
 * Sobe para 10.000 automaticamente com histórico de qualidade boa.
 */
export const LIMITE_TIER_24H = 1000;

/** Folga que campanhas de marketing não consomem, para não sufocar o transacional. */
export const RESERVA_TRANSACIONAL = 150;

/** Verifica se uma campanha de `alvo` destinatários cabe na cota das próximas 24h. */
export async function verificarCota(alvo: number): Promise<{
  cabe: boolean;
  disponivel: number;
  usados: number;
}> {
  const usados = await contarContatosUnicos24h();
  const disponivel = Math.max(0, LIMITE_TIER_24H - RESERVA_TRANSACIONAL - usados);
  return { cabe: alvo <= disponivel, disponivel, usados };
}
```

E adicionar o import no topo:

```typescript
import { contarContatosUnicos24h } from "@/lib/whatsapp-mensagem";
```

- [ ] **Step 4: Barrar o disparo quando não cabe**

Em `src/lib/campanha-service.ts`, dentro de `enviarCampanha`, logo após o bloco que carrega `clientes` e antes do `prisma.campanha.update({ ... status: "enviando" ... })`, inserir:

```typescript
  const cota = await verificarCota(clientes.length);
  if (!cota.cabe) {
    await prisma.campanha.update({
      where: { id: campanhaId },
      data: { status: "rascunho" },
    });
    logCron("campanha", "cota_excedida", {
      campanhaId,
      alvo: clientes.length,
      disponivel: cota.disponivel,
      usados: cota.usados,
    });
    throw new Error(
      `Campanha excede a cota de 24h da Meta: ${clientes.length} destinatários, ${cota.disponivel} disponíveis.`
    );
  }
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/campanha-cota.test.ts`
Expected: PASS — 4 testes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/campanha-service.ts src/__tests__/campanha-cota.test.ts
git commit -m "feat(campanhas): barra disparo que excede a cota de 24h da Meta"
```

---

### Task 9: Listagem de templates aprovados da Graph API

**Files:**
- Create: `src/lib/meta-templates.ts`
- Test: `src/__tests__/meta-templates.test.ts`

**Interfaces:**
- Consumes: `Config.metaWhatsappBusinessId`, `Config.metaWhatsappToken`, `Config.metaWhatsappApiVersion` (existentes)
- Produces:
  - `type VariavelTemplate = { indice: number }`
  - `type TemplateAprovado = { nome: string; idioma: string; categoria: string; corpo: string; variaveis: number }`
  - `listarTemplatesAprovados(forcarAtualizacao?: boolean): Promise<TemplateAprovado[]>`
  - `limparCacheTemplates(): void`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/meta-templates.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const configMock = { findFirst: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: { config: configMock } }));

const { listarTemplatesAprovados, limparCacheTemplates } = await import("@/lib/meta-templates");

const respostaGraph = {
  data: [
    {
      name: "bfx_promocao",
      language: "pt_BR",
      status: "APPROVED",
      category: "MARKETING",
      components: [{ type: "BODY", text: "Olá {{1}}, temos {{2}} para você!" }],
    },
    {
      name: "bfx_rascunho",
      language: "pt_BR",
      status: "PENDING",
      category: "MARKETING",
      components: [{ type: "BODY", text: "Aguardando" }],
    },
  ],
};

const okResponse = (json: unknown) =>
  ({ ok: true, status: 200, json: async () => json }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  limparCacheTemplates();
  configMock.findFirst.mockResolvedValue({
    metaWhatsappBusinessId: "WABA1",
    metaWhatsappToken: "TKN",
    metaWhatsappApiVersion: "v21.0",
  });
});

describe("listarTemplatesAprovados", () => {
  it("retorna só os APPROVED e conta as variáveis do corpo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(respostaGraph)));
    const out = await listarTemplatesAprovados();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      nome: "bfx_promocao",
      idioma: "pt_BR",
      categoria: "MARKETING",
      corpo: "Olá {{1}}, temos {{2}} para você!",
      variaveis: 2,
    });
  });

  it("chama o endpoint message_templates do WABA", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(respostaGraph));
    vi.stubGlobal("fetch", fetchMock);
    await listarTemplatesAprovados();
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("https://graph.facebook.com/v21.0/WABA1/message_templates");
  });

  it("usa cache na segunda chamada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(respostaGraph));
    vi.stubGlobal("fetch", fetchMock);
    await listarTemplatesAprovados();
    await listarTemplatesAprovados();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forcarAtualizacao ignora o cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(respostaGraph));
    vi.stubGlobal("fetch", fetchMock);
    await listarTemplatesAprovados();
    await listarTemplatesAprovados(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("devolve lista vazia quando não há WABA configurado", async () => {
    configMock.findFirst.mockResolvedValue({});
    expect(await listarTemplatesAprovados()).toEqual([]);
  });

  it("devolve lista vazia em erro HTTP, sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response));
    expect(await listarTemplatesAprovados()).toEqual([]);
  });

  it("conta variáveis sem duplicar índices repetidos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          data: [
            {
              name: "bfx_x",
              language: "pt_BR",
              status: "APPROVED",
              category: "UTILITY",
              components: [{ type: "BODY", text: "{{1}} e de novo {{1}} e {{2}}" }],
            },
          ],
        })
      )
    );
    const out = await listarTemplatesAprovados();
    expect(out[0]!.variaveis).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/meta-templates.test.ts`
Expected: FAIL — "Cannot find module '@/lib/meta-templates'"

- [ ] **Step 3: Implementar**

Criar `src/lib/meta-templates.ts`:

```typescript
/**
 * Listagem dos templates aprovados na conta WhatsApp Business (WABA).
 *
 * A UI de campanhas monta a galeria a partir daqui em vez de manter uma cópia
 * em código, que sairia de sincronia com o que está realmente aprovado na Meta
 * e faria a campanha falhar só no disparo.
 */
import { prisma } from "@/lib/db";

export type TemplateAprovado = {
  nome: string;
  idioma: string;
  categoria: string;
  corpo: string;
  /** Quantidade de variáveis distintas ({{1}}, {{2}}, ...) no corpo. */
  variaveis: number;
};

type ComponenteGraph = { type?: string; text?: string };
type TemplateGraph = {
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: ComponenteGraph[];
};

const CACHE_MS = 5 * 60 * 1000;
let cache: { em: number; dados: TemplateAprovado[] } | null = null;

export function limparCacheTemplates(): void {
  cache = null;
}

/**
 * Conta variáveis distintas no corpo do template.
 * Usa split em vez de regex com exec — o projeto bloqueia esse padrão.
 */
function contarVariaveis(texto: string): number {
  const indices = new Set<string>();
  const partes = texto.split("{{");
  for (let i = 1; i < partes.length; i++) {
    const fecha = partes[i]!.split("}}")[0];
    if (fecha && fecha.trim().length > 0) indices.add(fecha.trim());
  }
  return indices.size;
}

export async function listarTemplatesAprovados(
  forcarAtualizacao = false
): Promise<TemplateAprovado[]> {
  if (!forcarAtualizacao && cache && Date.now() - cache.em < CACHE_MS) {
    return cache.dados;
  }

  const cfg = (await prisma.config.findFirst()) as Record<string, unknown> | null;
  const wabaId = (cfg?.metaWhatsappBusinessId as string | undefined)?.trim();
  const token = (cfg?.metaWhatsappToken as string | undefined)?.trim();
  const versao = (cfg?.metaWhatsappApiVersion as string | undefined)?.trim() || "v21.0";
  if (!wabaId || !token) return [];

  try {
    const url = `https://graph.facebook.com/${versao}/${wabaId}/message_templates?limit=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.error("[MetaTemplates] HTTP", res.status);
      return [];
    }
    const json = (await res.json()) as { data?: TemplateGraph[] };

    const dados: TemplateAprovado[] = [];
    for (const t of json.data ?? []) {
      if (t.status !== "APPROVED" || !t.name) continue;
      const body = (t.components ?? []).find((c) => c.type === "BODY");
      const corpo = body?.text ?? "";
      dados.push({
        nome: t.name,
        idioma: t.language ?? "pt_BR",
        categoria: t.category ?? "UTILITY",
        corpo,
        variaveis: contarVariaveis(corpo),
      });
    }

    cache = { em: Date.now(), dados };
    return dados;
  } catch (err) {
    console.error("[MetaTemplates]", err);
    return [];
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/meta-templates.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/meta-templates.ts src/__tests__/meta-templates.test.ts
git commit -m "feat(campanhas): lista templates aprovados da Graph API com cache"
```

---

### Task 10: Campanhas disparam por template

**Files:**
- Modify: `prisma/schema.prisma` (modelo `Campanha`)
- Modify: `src/lib/campanha-service.ts`
- Test: `src/__tests__/campanha-template.test.ts`

**Interfaces:**
- Consumes: `enviarWhatsApp` (Task 3), `comFallback` (Task 6), `verificarCota` (Task 8)
- Produces:
  - `Campanha.templateNome String?` e `Campanha.variaveisJson String?` no schema
  - `renderVariaveis(variaveisJson: string | null, nome: string): string[]`
  - `enviarCampanha` passa a montar template

- [ ] **Step 1: Adicionar os campos ao schema**

Em `prisma/schema.prisma`, no modelo `Campanha`, logo abaixo de `mensagem String`:

```prisma
  templateNome  String?  @map("template_nome")   // template aprovado na Meta
  variaveisJson String?  @map("variaveis_json")  // array JSON de variáveis, com {nome} suportado
```

`mensagem` continua obrigatório e passa a guardar o corpo renderizado para exibição no histórico. Campanhas antigas mantêm `templateNome = null` e ficam somente-leitura.

Run: `yarn prisma migrate dev --name campanha_template`
Expected: `ALTER TABLE "campanhas" ADD COLUMN "template_nome"` e `"variaveis_json"`.

- [ ] **Step 2: Escrever o teste que falha**

Criar `src/__tests__/campanha-template.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/crm", () => ({ buildClienteSegmentWhere: vi.fn(() => ({})) }));
vi.mock("@/lib/whatsapp", () => ({ enviarWhatsAppDetalhado: vi.fn() }));
vi.mock("@/lib/whatsapp-templates", () => ({ comFallback: vi.fn(), TEMPLATES: {} }));
vi.mock("@/lib/whatsapp-mensagem", () => ({ contarContatosUnicos24h: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logCron: vi.fn() }));

const { renderVariaveis, renderMensagem } = await import("@/lib/campanha-service");

describe("renderVariaveis", () => {
  it("substitui {nome} e {primeiroNome} em cada variável", () => {
    const json = JSON.stringify(["{primeiroNome}", "20% de desconto"]);
    expect(renderVariaveis(json, "João da Silva")).toEqual(["João", "20% de desconto"]);
  });

  it("devolve array vazio para json nulo", () => {
    expect(renderVariaveis(null, "João")).toEqual([]);
  });

  it("devolve array vazio para json inválido", () => {
    expect(renderVariaveis("{nao é json", "João")).toEqual([]);
  });

  it("devolve array vazio quando o json não é array", () => {
    expect(renderVariaveis(JSON.stringify({ a: 1 }), "João")).toEqual([]);
  });

  it("converte itens não-string em string", () => {
    expect(renderVariaveis(JSON.stringify([1, true]), "João")).toEqual(["1", "true"]);
  });
});

describe("renderMensagem", () => {
  it("continua substituindo {nome} e {primeiroNome}", () => {
    expect(renderMensagem("Oi {primeiroNome}, tudo bem {nome}?", "João da Silva")).toBe(
      "Oi João, tudo bem João da Silva?"
    );
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/campanha-template.test.ts`
Expected: FAIL — `renderVariaveis is not a function`

- [ ] **Step 4: Implementar `renderVariaveis` e trocar o envio**

Em `src/lib/campanha-service.ts`, adicionar após `renderMensagem`:

```typescript
/** Renderiza as variáveis do template, aplicando {nome}/{primeiroNome} em cada uma. */
export function renderVariaveis(variaveisJson: string | null, nome: string): string[] {
  if (!variaveisJson) return [];
  try {
    const arr = JSON.parse(variaveisJson);
    if (!Array.isArray(arr)) return [];
    return arr.map((v) => renderMensagem(String(v), nome));
  } catch {
    return [];
  }
}
```

Trocar o import de envio no topo:

```typescript
import { enviarWhatsAppDetalhado } from "@/lib/whatsapp";
import { comFallback } from "@/lib/whatsapp-templates";
```

E, dentro do laço `for (const c of clientes)`, substituir as duas linhas

```typescript
    const texto = renderMensagem(campanha.mensagem, c.nome);
    const ok = await enviarWhatsAppTexto(c.telefone, texto);
```

por:

```typescript
    const texto = renderMensagem(campanha.mensagem, c.nome);
    const { ok, mensagemId } = await enviarWhatsAppDetalhado({
      telefone: c.telefone,
      clienteId: c.id,
      origem: "campanha",
      template: comFallback(
        campanha.templateNome ?? "",
        renderVariaveis(campanha.variaveisJson, c.nome),
        texto
      ),
    });
```

E, logo abaixo, no `prisma.campanhaEnvio.upsert` do mesmo laço, ligar o envio à
mensagem para que o status de entrega por destinatário venha de
`WhatsAppMensagem`. Substituir o bloco existente por:

```typescript
    await prisma.campanhaEnvio.upsert({
      where: { campanhaId_clienteId: { campanhaId, clienteId: c.id } },
      create: {
        campanhaId,
        clienteId: c.id,
        status: ok ? "enviado" : "falha",
        mensagemId,
      },
      update: {
        status: ok ? "enviado" : "falha",
        erro: ok ? null : "envio falhou",
        mensagemId,
      },
    });
```

Campanha antiga (`templateNome = null`) produz `name: ""`, e `enviarWhatsApp` a marca como `janela_expirada` fora da janela em vez de tentar um envio que a Meta recusaria — que é o comportamento correto para campanhas somente-leitura.

- [ ] **Step 5: Recusar disparo de campanha sem template**

Em `enviarCampanha`, logo após `if (!campanha) throw new Error("Campanha não encontrada");`:

```typescript
  if (!campanha.templateNome) {
    throw new Error(
      "Campanha sem template aprovado. Campanhas criadas antes da migração para a Cloud API são somente-leitura; recrie-a escolhendo um template."
    );
  }
```

- [ ] **Step 6: Rodar testes e tipos**

Run: `yarn vitest run src/__tests__/campanha-template.test.ts && yarn tsc --noEmit -p tsconfig.json`
Expected: 6 testes PASS; sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/campanha-service.ts src/__tests__/campanha-template.test.ts
git commit -m "feat(campanhas): disparo por template aprovado da Meta"
```

---

### Task 11: UI de campanhas com galeria de templates

**Files:**
- Modify: `src/app/(app)/crm/campanhas/actions.ts`
- Create: `src/components/campanha-template-picker.tsx`
- Modify: `src/app/(app)/crm/campanhas/page.tsx`

**Interfaces:**
- Consumes: `listarTemplatesAprovados`, `TemplateAprovado` (Task 9); `verificarCota` (Task 8); `Campanha.templateNome`/`variaveisJson` (Task 10)
- Produces: server action `carregarTemplates(forcar?: boolean): Promise<TemplateAprovado[]>`; o formulário de campanha envia `templateNome` e `variaveis[]` em vez de `mensagem`

Esta task não tem teste automatizado — é UI, e o projeto não tem infraestrutura de teste de componente (Playwright existe mas os testes de UI não cobrem o CRM). A verificação é manual, no Step 5.

- [ ] **Step 1: Expor a listagem como server action**

Em `src/app/(app)/crm/campanhas/actions.ts`, adicionar:

```typescript
"use server";

import { listarTemplatesAprovados, type TemplateAprovado } from "@/lib/meta-templates";
import { verificarCota } from "@/lib/campanha-service";
import { requireAdmin } from "@/lib/guards";

export async function carregarTemplates(forcar = false): Promise<TemplateAprovado[]> {
  await requireAdmin();
  return listarTemplatesAprovados(forcar);
}

export async function consultarCota(alvo: number) {
  await requireAdmin();
  return verificarCota(alvo);
}
```

Se o arquivo já tiver `"use server"` no topo e imports, apenas acrescentar as duas funções e os imports que faltarem.

- [ ] **Step 2: Criar o componente da galeria**

Criar `src/components/campanha-template-picker.tsx`:

```tsx
"use client";

/**
 * Seletor de template aprovado para campanhas de WhatsApp.
 *
 * Substitui a antiga caixa de texto livre: a Cloud API só aceita templates
 * pré-aprovados em mensagens business-initiated, então o admin escolhe um da
 * lista e preenche as variáveis.
 */
import { useState } from "react";
import type { TemplateAprovado } from "@/lib/meta-templates";

type Props = {
  templates: TemplateAprovado[];
  /** Server action que refaz a busca na Graph API ignorando o cache. */
  onAtualizar: () => Promise<TemplateAprovado[]>;
};

/** Substitui {{1}}, {{2}}, ... pelos valores digitados. */
function renderPreview(corpo: string, valores: string[]): string {
  let out = corpo;
  valores.forEach((v, i) => {
    out = out.split("{{" + (i + 1) + "}}").join(v || `{{${i + 1}}}`);
  });
  return out;
}

export function CampanhaTemplatePicker({ templates, onAtualizar }: Props) {
  const [lista, setLista] = useState(templates);
  const [nome, setNome] = useState("");
  const [valores, setValores] = useState<string[]>([]);
  const [atualizando, setAtualizando] = useState(false);

  const selecionado = lista.find((t) => t.nome === nome) ?? null;

  function escolher(novoNome: string) {
    setNome(novoNome);
    const t = lista.find((x) => x.nome === novoNome);
    setValores(new Array(t?.variaveis ?? 0).fill(""));
  }

  async function atualizar() {
    setAtualizando(true);
    try {
      const novos = await onAtualizar();
      setLista(novos);
      if (!novos.some((t) => t.nome === nome)) {
        setNome("");
        setValores([]);
      }
    } finally {
      setAtualizando(false);
    }
  }

  if (lista.length === 0) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
        <p>
          Nenhum template aprovado na Meta. Aprove um template no WhatsApp Manager
          antes de criar campanhas.
        </p>
        <button
          type="button"
          onClick={atualizar}
          disabled={atualizando}
          className="mt-2 underline"
        >
          {atualizando ? "Atualizando..." : "Atualizar lista"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium">Template</span>
          <select
            name="templateNome"
            value={nome}
            onChange={(e) => escolher(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Selecione um template aprovado</option>
            {lista.map((t) => (
              <option key={t.nome} value={t.nome}>
                {t.nome} — {t.categoria}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={atualizar}
          disabled={atualizando}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {atualizando ? "..." : "Atualizar"}
        </button>
      </div>

      {selecionado && selecionado.variaveis > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Variáveis</legend>
          {valores.map((v, i) => (
            <input
              key={i}
              name="variaveis"
              value={v}
              onChange={(e) => {
                const novos = [...valores];
                novos[i] = e.target.value;
                setValores(novos);
              }}
              required
              placeholder={`{{${i + 1}}} — use {nome} ou {primeiroNome}`}
              className="w-full rounded-md border px-3 py-2"
            />
          ))}
        </fieldset>
      )}

      {selecionado && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="mb-1 font-medium">Prévia</p>
          <p className="whitespace-pre-wrap">
            {renderPreview(selecionado.corpo, valores)}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2b: Usar o componente na página**

Em `src/app/(app)/crm/campanhas/page.tsx`, remover o campo `<textarea name="mensagem" ... />` do formulário de criação e pôr no lugar:

```tsx
<CampanhaTemplatePicker
  templates={await carregarTemplates()}
  onAtualizar={async () => {
    "use server";
    return carregarTemplates(true);
  }}
/>
```

Adicionar o import no topo do arquivo:

```tsx
import { CampanhaTemplatePicker } from "@/components/campanha-template-picker";
import { carregarTemplates } from "./actions";
```

O `filtroJson` (seleção de segmento) e o campo `agendadaPara` **não mudam**.

- [ ] **Step 3: Montar `mensagem` a partir do template no submit**

Na action que cria a campanha (mesmo arquivo `actions.ts`), ao gravar:

```typescript
  const templateNome = String(formData.get("templateNome") || "");
  const variaveis = formData.getAll("variaveis").map((v) => String(v));
  const template = (await listarTemplatesAprovados()).find((t) => t.nome === templateNome);
  if (!template) throw new Error("Template não encontrado ou não aprovado.");

  // `mensagem` guarda o corpo renderizado, para exibição no histórico.
  let mensagem = template.corpo;
  variaveis.forEach((v, i) => {
    mensagem = mensagem.split("{{" + (i + 1) + "}}").join(v);
  });

  await prisma.campanha.create({
    data: {
      nome,
      filtroJson,
      mensagem,
      templateNome,
      variaveisJson: JSON.stringify(variaveis),
      agendadaPara,
      status: agendadaPara ? "agendada" : "rascunho",
    },
  });
```

- [ ] **Step 4: Marcar campanhas antigas como somente-leitura**

Na listagem de campanhas em `page.tsx`, quando `campanha.templateNome` for nulo, desabilitar o botão de disparo e exibir o aviso: `"Campanha anterior à migração para a Cloud API — somente leitura. Recrie escolhendo um template."`

- [ ] **Step 5: Verificação manual**

Run: `yarn dev`

Abrir `http://localhost:3008/crm/campanhas` e confirmar:
- o seletor de templates carrega (vazio é esperado até haver templates aprovados na Meta — nesse caso o `<select>` fica sem opções e o formulário não permite submeter)
- campanhas antigas aparecem com o aviso e sem botão de disparo
- criar uma campanha nova com um template exige preencher todas as variáveis

- [ ] **Step 6: Verificar build e tipos**

Run: `yarn tsc --noEmit -p tsconfig.json && yarn lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/crm/campanhas src/components/campanha-template-picker.tsx
git commit -m "feat(campanhas): UI com galeria de templates aprovados"
```

---

### Task 12: Documentação de cutover

**Files:**
- Modify: `docs/whatsapp-cloud-api.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: tudo das tasks 1–11
- Produces: runbook de cutover; variável `META_APP_SECRET` documentada

- [ ] **Step 1: Documentar a variável nova**

Em `.env.example`, junto das outras `META_*`:

```bash
# App Secret do app da Meta — valida X-Hub-Signature-256 no webhook.
# Sem ele o webhook rejeita TODO POST com 401.
META_APP_SECRET=
```

- [ ] **Step 2: Escrever o runbook de cutover**

Em `docs/whatsapp-cloud-api.md`, adicionar a seção:

```markdown
## Runbook de cutover

Pré-requisitos (não dependem de código, e são o gargalo):

1. Verificação de negócio aprovada na Meta.
2. Número conectado à WABA.
3. Os 10 templates transacionais aprovados: `bfx_lembrete_parcela`,
   `bfx_parcela_vencida`, `bfx_aniversario`, `bfx_agradecimento`, `bfx_nps`,
   `bfx_reativacao`, `bfx_boas_vindas`, `bfx_recibo`, `bfx_boleto`,
   `bfx_relatorio_empresa`. Os nomes devem bater EXATAMENTE com
   `src/lib/whatsapp-templates.ts`, e a contagem de variáveis do corpo deve
   bater com os `bodyParams` passados em cada call site.

Passos:

1. Preencher em Config (ou por env): `metaWhatsappToken`,
   `metaWhatsappPhoneNumberId`, `metaWhatsappBusinessId`,
   `metaWebhookVerifyToken`, `metaAppSecret`.
2. Registrar o webhook no App Dashboard apontando para
   `https://<dominio>/api/webhooks/meta-whatsapp`, assinando os campos
   `messages`. O handshake GET deve retornar o challenge.
3. Enviar uma mensagem de teste do número de teste da Meta para o sistema e
   confirmar que aparece em `whatsapp_mensagens` com `direcao = 'in'`.
4. Antes de virar: verificar se há campanha com `status = 'agendada'` e
   `agendada_para` no futuro. Campanhas anteriores à migração têm
   `template_nome` nulo e vão falhar — recriar sobre um template.

   ```sql
   SELECT id, nome, agendada_para FROM campanhas
   WHERE status = 'agendada' AND template_nome IS NULL;
   ```

5. Virar a chave: `UPDATE config SET whatsapp_provider = 'meta_cloud';`
6. Monitorar por alguns dias:

   ```sql
   SELECT status, count(*) FROM whatsapp_mensagens
   WHERE criado_em > now() - interval '24 hours' GROUP BY status;
   ```

   Falhas com `erro_codigo = 131047` significam envio fora da janela de 24h sem
   template válido — indica template não aprovado ou nome divergente.

## Rollback

Entre o passo 5 e a remoção da Evolution:
`UPDATE config SET whatsapp_provider = 'evolution';`

**Isto vale para o código, não para o número.** A migração de número é de mão
única: uma vez que o número entra na Meta, tirá-lo de lá implica
indisponibilidade. Se o problema for com o próprio número, o rollback acima não
resolve.

## Remoção da Evolution (PR separado, dias após a virada)

Só depois de confirmada a estabilidade. Remover:

- `src/lib/providers/whatsapp-evolution.ts`, `src/lib/evolution.ts`
- `src/app/api/webhooks/evolution/route.ts`, `src/app/api/whatsapp/route.ts`
- `src/components/whatsapp-connect.tsx`
- o `fallbackText` de `WhatsAppTemplate` e o `comFallback` correspondente
- `docker-compose.evolution.yml`, `deploy/bfx/evolution-api.yaml`
- `scripts/registrar-webhook-evolution.js`, `scripts/config-whatsapp.js`,
  `scripts/whatsapp-qrcode.ps1`, `scripts/whatsapp-pairing-code.ps1`
- os scripts `evolution:up` / `evolution:down` do `package.json`
- os campos `evolution*` e `whatsappFallbackEvolution` de `Config` (migração)
```

- [ ] **Step 3: Verificar a suíte completa uma última vez**

Run: `yarn test && yarn tsc --noEmit -p tsconfig.json && yarn lint`
Expected: tudo PASS, sem erros.

- [ ] **Step 4: Commit e push**

```bash
git add docs/whatsapp-cloud-api.md .env.example
git commit -m "docs(whatsapp): runbook de cutover e remocao da Evolution"
git pull --rebase
git push
```

---

## Notas de execução

**A remoção da Evolution não está neste plano.** É um PR separado, executado dias
após o cutover, com o roteiro documentado na Task 12. Removê-la antes de
confirmar estabilidade elimina a rede de segurança do rollback.

**Nenhuma task vira `whatsappProvider` para `meta_cloud`.** Todo o código deste
plano convive com a Evolution ativa; a virada é operacional.

**Ordem de dependências:** Task 1 → 2 → 3 são sequenciais. Tasks 4 e 9 são
independentes e podem rodar em paralelo com 2–3. Task 5 depende de 2 e 4. Task 6
e 7 dependem de 3. Task 8 depende de 2. Task 10 depende de 3, 6 e 8. Task 11
depende de 9 e 10. Task 12 é a última.
