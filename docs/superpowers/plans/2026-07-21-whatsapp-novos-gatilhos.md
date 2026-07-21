# Novos Gatilhos de WhatsApp — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 3 crons de WhatsApp — recompra, primeira compra e datas comemorativas — todos passando pela camada `enviarWhatsApp` existente, entrando dormentes até o admin ligar as flags.

**Architecture:** Cada gatilho é um route handler em `src/app/api/cron/*` seguindo o padrão dos crons existentes (auth por `CRON_SECRET`, `getWhatsAppFlags`, `enviarWhatsApp`, dedup por `WhatsAppEnvioLog`). Dois helpers puros e testáveis (`datas-comemorativas.ts`, `primeira-compra.ts`) isolam a lógica de decisão. Flags novas em `Config` e templates novos no registry.

**Tech Stack:** Next.js 15 (App Router), Prisma + Postgres, Vitest, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-07-21-templates-comemorativas-recompra-primeira-compra-design.md`

## Global Constraints

- Gerenciador de pacotes: **Yarn 1.22 — sempre `yarn <cmd>`, nunca `npx`** (npx baixa Prisma 7, o projeto usa 6.5).
- Banco de desenvolvimento: **`bfx_dev`** (já no `.env`). Nunca apontar para `bfx` (dados reais). Se `prisma migrate dev` pedir reset, PARAR e reportar BLOCKED.
- Testes em `src/__tests__/**/*.test.ts`; rodar com `yarn vitest run <arquivo>`; `fetch`/`prisma` sempre mockados, sem rede/banco real.
- **Proibido o padrão `RegExp exec`** (hook de segurança bloqueia a edição). Usar `.split()`.
- Idioma do código e comentários: português.
- TDD: o teste que falha vem antes da implementação.
- Commit ao fim de cada task. Sem push (o controlador cuida do push/PR).
- Branch de trabalho: `feat/whatsapp-novos-gatilhos`.
- **Tudo entra dormente**: flags novas default 0. Nenhuma task liga automação.
- Padrão de cron (copiar dos existentes): auth `if (cronSecret && authHeader !== \`Bearer ${cronSecret}\`) return 401`; `const waConfig = await getWhatsAppFlags(); if (!waConfig?.<flag>) return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });`; envio via `enviarWhatsApp({ telefone, clienteId, origem: "cron", template: comFallback(TEMPLATES.<x>, [params], msg) })`; dedup por `WhatsAppEnvioLog`.
- Baseline antes de começar: 173 testes verdes.

---

### Task 1: Flags de Config e templates no registry

**Files:**
- Modify: `prisma/schema.prisma` (modelo `Config`)
- Modify: `src/lib/whatsapp.ts` (`WhatsAppFlags` + `getWhatsAppFlags`)
- Modify: `src/lib/whatsapp-templates.ts` (registry)
- Test: `src/__tests__/whatsapp-flags-novos.test.ts`
- Create: `prisma/migrations/<timestamp>_gatilhos_whatsapp/migration.sql` (gerado)

**Interfaces:**
- Produces:
  - `Config.whatsappAutoRecompra`, `whatsappDiasRecompra`, `whatsappAutoPrimeiraCompra`, `whatsappAutoComemorativas`, `whatsappMesesAtivoComemorativa`
  - `WhatsAppFlags` ganha `autoRecompra: boolean`, `diasRecompra: number`, `autoPrimeiraCompra: boolean`, `autoComemorativas: boolean`, `mesesAtivoComemorativa: number`
  - `TEMPLATES.recompra`, `.primeiraCompra`, `.natal`, `.anoNovo`, `.diaCliente`, `.diaCriancas`, `.diaNamorados`, `.diaMulheres`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/whatsapp-flags-novos.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const configMock = { findFirst: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: { config: configMock } }));

const { getWhatsAppFlags } = await import("@/lib/whatsapp");
const { TEMPLATES } = await import("@/lib/whatsapp-templates");

beforeEach(() => vi.clearAllMocks());

describe("getWhatsAppFlags — flags novas", () => {
  it("defaults: automações novas desligadas, diasRecompra 30, mesesAtivo 6", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1 });
    const f = (await getWhatsAppFlags())!;
    expect(f.autoRecompra).toBe(false);
    expect(f.autoPrimeiraCompra).toBe(false);
    expect(f.autoComemorativas).toBe(false);
    expect(f.diasRecompra).toBe(30);
    expect(f.mesesAtivoComemorativa).toBe(6);
  });

  it("respeita valores customizados", async () => {
    configMock.findFirst.mockResolvedValue({
      whatsappAutoEnabled: 1,
      whatsappAutoRecompra: 1,
      whatsappDiasRecompra: 45,
      whatsappAutoPrimeiraCompra: 1,
      whatsappAutoComemorativas: 1,
      whatsappMesesAtivoComemorativa: 3,
    });
    const f = (await getWhatsAppFlags())!;
    expect(f.autoRecompra).toBe(true);
    expect(f.diasRecompra).toBe(45);
    expect(f.autoPrimeiraCompra).toBe(true);
    expect(f.autoComemorativas).toBe(true);
    expect(f.mesesAtivoComemorativa).toBe(3);
  });
});

describe("TEMPLATES — novos", () => {
  it("inclui os 8 novos com prefixo bfx_", () => {
    expect(TEMPLATES.recompra).toBe("bfx_recompra");
    expect(TEMPLATES.primeiraCompra).toBe("bfx_primeira_compra");
    expect(TEMPLATES.natal).toBe("bfx_natal");
    expect(TEMPLATES.anoNovo).toBe("bfx_ano_novo");
    expect(TEMPLATES.diaCliente).toBe("bfx_dia_cliente");
    expect(TEMPLATES.diaCriancas).toBe("bfx_dia_criancas");
    expect(TEMPLATES.diaNamorados).toBe("bfx_dia_namorados");
    expect(TEMPLATES.diaMulheres).toBe("bfx_dia_mulheres");
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/whatsapp-flags-novos.test.ts`
Expected: FAIL — `autoRecompra` undefined / `TEMPLATES.recompra` undefined.

- [ ] **Step 3: Adicionar as flags ao schema**

Em `prisma/schema.prisma`, no modelo `Config`, logo abaixo de `whatsappDiasInativo`:

```prisma
  whatsappAutoRecompra       Int?    @default(0) @map("whatsapp_auto_recompra")         // Recompra: 30-59 dias sem comprar
  whatsappDiasRecompra       Int?    @default(30) @map("whatsapp_dias_recompra")        // Inicio da faixa de recompra
  whatsappAutoPrimeiraCompra Int?    @default(0) @map("whatsapp_auto_primeira_compra")  // Mensagem especial na 1a compra
  whatsappAutoComemorativas  Int?    @default(0) @map("whatsapp_auto_comemorativas")    // Datas comemorativas fixas
  whatsappMesesAtivoComemorativa Int? @default(6) @map("whatsapp_meses_ativo_comemorativa") // Janela de cliente ativo
```

- [ ] **Step 4: Gerar a migração**

Run: `yarn prisma migrate dev --name gatilhos_whatsapp`
Expected: cria a migration com 5 `ALTER TABLE "config" ADD COLUMN`. Confirmar abrindo o `migration.sql` — deve conter SOMENTE os 5 ADD COLUMN. Se contiver qualquer outro DDL ou pedir reset, PARAR e reportar BLOCKED.

- [ ] **Step 5: Estender `WhatsAppFlags` e `getWhatsAppFlags`**

Em `src/lib/whatsapp.ts`, adicionar ao tipo `WhatsAppFlags` (após `diasInativo: number;`):

```typescript
  autoRecompra: boolean;
  diasRecompra: number;
  autoPrimeiraCompra: boolean;
  autoComemorativas: boolean;
  mesesAtivoComemorativa: number;
```

E ao objeto retornado por `getWhatsAppFlags` (após `diasInativo: cfg?.whatsappDiasInativo ?? 60,`):

```typescript
    autoRecompra: cfg?.whatsappAutoRecompra === 1,
    diasRecompra: cfg?.whatsappDiasRecompra ?? 30,
    autoPrimeiraCompra: cfg?.whatsappAutoPrimeiraCompra === 1,
    autoComemorativas: cfg?.whatsappAutoComemorativas === 1,
    mesesAtivoComemorativa: cfg?.whatsappMesesAtivoComemorativa ?? 6,
```

- [ ] **Step 6: Adicionar os templates ao registry**

Em `src/lib/whatsapp-templates.ts`, no objeto `TEMPLATES`, antes do `} as const;`:

```typescript
  recompra: "bfx_recompra",
  primeiraCompra: "bfx_primeira_compra",
  natal: "bfx_natal",
  anoNovo: "bfx_ano_novo",
  diaCliente: "bfx_dia_cliente",
  diaCriancas: "bfx_dia_criancas",
  diaNamorados: "bfx_dia_namorados",
  diaMulheres: "bfx_dia_mulheres",
```

- [ ] **Step 7: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/whatsapp-flags-novos.test.ts && yarn tsc --noEmit -p tsconfig.json`
Expected: 4 testes PASS; tsc sem erros.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/whatsapp.ts src/lib/whatsapp-templates.ts src/__tests__/whatsapp-flags-novos.test.ts
git commit -m "feat(whatsapp): flags e templates para recompra, primeira compra e comemorativas"
```

---

### Task 2: Helper `ehPrimeiraCompra`

**Files:**
- Create: `src/lib/primeira-compra.ts`
- Test: `src/__tests__/primeira-compra.test.ts`

**Interfaces:**
- Consumes: `prisma` de `@/lib/db`
- Produces: `ehPrimeiraCompra(clienteId: number, vendaId: number): Promise<boolean>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/primeira-compra.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = { venda: { count: vi.fn() } };
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { ehPrimeiraCompra } = await import("@/lib/primeira-compra");

beforeEach(() => vi.clearAllMocks());

describe("ehPrimeiraCompra", () => {
  it("true quando não existe venda anterior do cliente", async () => {
    prismaMock.venda.count.mockResolvedValue(0);
    expect(await ehPrimeiraCompra(7, 100)).toBe(true);
    const where = prismaMock.venda.count.mock.calls[0]![0].where;
    expect(where.clienteId).toBe(7);
    expect(where.id.lt).toBe(100);
  });

  it("false quando existe venda anterior", async () => {
    prismaMock.venda.count.mockResolvedValue(2);
    expect(await ehPrimeiraCompra(7, 100)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/primeira-compra.test.ts`
Expected: FAIL — "Cannot find module '@/lib/primeira-compra'"

- [ ] **Step 3: Implementar**

Criar `src/lib/primeira-compra.ts`:

```typescript
/**
 * Determina se uma venda é a PRIMEIRA compra do cliente.
 *
 * Compartilhado entre o cron `primeira-compra` (que inclui esses casos) e o
 * `agradecimento-pos-venda` (que os exclui quando a primeira compra está ativa),
 * garantindo que o cliente de primeira viagem receba só uma mensagem.
 */
import { prisma } from "@/lib/db";

export async function ehPrimeiraCompra(clienteId: number, vendaId: number): Promise<boolean> {
  const anteriores = await prisma.venda.count({
    where: { clienteId, id: { lt: vendaId } },
  });
  return anteriores === 0;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/primeira-compra.test.ts`
Expected: 2 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/primeira-compra.ts src/__tests__/primeira-compra.test.ts
git commit -m "feat(whatsapp): helper ehPrimeiraCompra compartilhado"
```

---

### Task 3: Helper `datas-comemorativas`

**Files:**
- Create: `src/lib/datas-comemorativas.ts`
- Test: `src/__tests__/datas-comemorativas.test.ts`

**Interfaces:**
- Consumes: `TEMPLATES` de `@/lib/whatsapp-templates` (Task 1)
- Produces:
  - `type DataComemorativa = { slug: string; dia: number; mes: number; ocasiao: string; template: string }`
  - `DATAS_COMEMORATIVAS: DataComemorativa[]`
  - `dataComemorativaDeHoje(hoje: Date): DataComemorativa | null`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/datas-comemorativas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  DATAS_COMEMORATIVAS,
  dataComemorativaDeHoje,
} from "@/lib/datas-comemorativas";

describe("DATAS_COMEMORATIVAS", () => {
  it("tem as 6 datas fixas com templates bfx_", () => {
    expect(DATAS_COMEMORATIVAS).toHaveLength(6);
    const slugs = DATAS_COMEMORATIVAS.map((d) => d.slug).sort();
    expect(slugs).toEqual(
      ["ano_novo", "dia_cliente", "dia_criancas", "dia_mulheres", "dia_namorados", "natal"].sort()
    );
    for (const d of DATAS_COMEMORATIVAS) {
      expect(d.template.startsWith("bfx_")).toBe(true);
    }
  });
});

describe("dataComemorativaDeHoje", () => {
  it("acerta o Natal (25/12)", () => {
    const d = dataComemorativaDeHoje(new Date(2026, 11, 25)); // mes 11 = dezembro
    expect(d?.slug).toBe("natal");
  });

  it("acerta o Dia dos Namorados (12/06) e não confunde com 06/12", () => {
    expect(dataComemorativaDeHoje(new Date(2026, 5, 12))?.slug).toBe("dia_namorados"); // 12/jun
    expect(dataComemorativaDeHoje(new Date(2026, 11, 6))).toBeNull(); // 06/dez não é data
  });

  it("devolve null em data comum", () => {
    expect(dataComemorativaDeHoje(new Date(2026, 6, 21))).toBeNull(); // 21/jul
  });

  it("acerta Ano Novo, Dia do Cliente, Crianças e Mulheres", () => {
    expect(dataComemorativaDeHoje(new Date(2026, 0, 1))?.slug).toBe("ano_novo");
    expect(dataComemorativaDeHoje(new Date(2026, 8, 15))?.slug).toBe("dia_cliente");
    expect(dataComemorativaDeHoje(new Date(2026, 9, 12))?.slug).toBe("dia_criancas");
    expect(dataComemorativaDeHoje(new Date(2026, 2, 8))?.slug).toBe("dia_mulheres");
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/datas-comemorativas.test.ts`
Expected: FAIL — "Cannot find module '@/lib/datas-comemorativas'"

- [ ] **Step 3: Implementar**

Criar `src/lib/datas-comemorativas.ts`:

```typescript
/**
 * Tabela das datas comemorativas fixas do BFX e resolução da data de hoje.
 *
 * Só datas FIXAS no calendário (dia/mês). Datas móveis (Dia das Mães, Black
 * Friday) e Páscoa estão fora de escopo. `dataComemorativaDeHoje` recebe a data
 * por parâmetro para ser testável sem relógio real.
 */
import { TEMPLATES } from "@/lib/whatsapp-templates";

export type DataComemorativa = {
  slug: string;
  dia: number;
  mes: number; // 1-12
  ocasiao: string;
  template: string;
};

export const DATAS_COMEMORATIVAS: DataComemorativa[] = [
  { slug: "ano_novo", dia: 1, mes: 1, ocasiao: "Feliz Ano Novo", template: TEMPLATES.anoNovo },
  { slug: "dia_mulheres", dia: 8, mes: 3, ocasiao: "Dia Internacional da Mulher", template: TEMPLATES.diaMulheres },
  { slug: "dia_namorados", dia: 12, mes: 6, ocasiao: "Dia dos Namorados", template: TEMPLATES.diaNamorados },
  { slug: "dia_cliente", dia: 15, mes: 9, ocasiao: "Dia do Cliente", template: TEMPLATES.diaCliente },
  { slug: "dia_criancas", dia: 12, mes: 10, ocasiao: "Dia das Crianças", template: TEMPLATES.diaCriancas },
  { slug: "natal", dia: 25, mes: 12, ocasiao: "Feliz Natal", template: TEMPLATES.natal },
];

/** Devolve a data comemorativa que casa com `hoje`, ou null. */
export function dataComemorativaDeHoje(hoje: Date): DataComemorativa | null {
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;
  return DATAS_COMEMORATIVAS.find((d) => d.dia === dia && d.mes === mes) ?? null;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/datas-comemorativas.test.ts`
Expected: 6 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/datas-comemorativas.ts src/__tests__/datas-comemorativas.test.ts
git commit -m "feat(whatsapp): tabela de datas comemorativas fixas"
```

---

### Task 4: Cron `recompra`

**Files:**
- Create: `src/app/api/cron/recompra/route.ts`
- Test: `src/__tests__/cron-recompra.test.ts`

**Interfaces:**
- Consumes: `getWhatsAppFlags` (com `autoRecompra`, `diasRecompra`, `diasInativo`), `enviarWhatsApp`, `TEMPLATES.recompra`, `comFallback`, `prisma`
- Produces: `GET(req: Request)` route handler

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/cron-recompra.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const flags = { getWhatsAppFlags: vi.fn() };
const envio = { enviarWhatsApp: vi.fn() };
const prismaMock = {
  venda: { groupBy: vi.fn() },
  whatsAppEnvioLog: { findMany: vi.fn(), create: vi.fn() },
  cliente: { findMany: vi.fn() },
};

vi.mock("@/lib/whatsapp", () => ({ ...flags, ...envio }));
vi.mock("@/lib/whatsapp-templates", () => ({
  TEMPLATES: { recompra: "bfx_recompra" },
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/recompra/route");

function req() {
  return new Request("http://x/api/cron/recompra");
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("cron recompra", () => {
  it("sai cedo quando a flag está desligada", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoRecompra: false });
    const res = await GET(req());
    expect((await res.json()).desativado).toBe(true);
    expect(prismaMock.venda.groupBy).not.toHaveBeenCalled();
  });

  it("envia para cliente na faixa 30-59 dias e loga", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoRecompra: true, diasRecompra: 30, diasInativo: 60 });
    const hoje = Date.now();
    const dias = (n: number) => new Date(hoje - n * 86400000);
    prismaMock.venda.groupBy.mockResolvedValue([
      { clienteId: 1, _max: { dataVenda: dias(45) } }, // dentro: entra
      { clienteId: 2, _max: { dataVenda: dias(20) } }, // recente demais: fora
      { clienteId: 3, _max: { dataVenda: dias(70) } }, // inativo (reativacao): fora
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    prismaMock.cliente.findMany.mockResolvedValue([{ id: 1, nome: "Ana", telefone: "5592" }]);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    const json = await res.json();
    expect(json.enviados).toBe(1);
    // só o cliente 1 vira alvo do findMany
    const idsFinais = prismaMock.cliente.findMany.mock.calls[0]![0].where.id.in;
    expect(idsFinais).toEqual([1]);
    expect(prismaMock.whatsAppEnvioLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clienteId: 1, tipo: "recompra" }) })
    );
  });

  it("exclui quem já recebeu recompra no cooldown", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoRecompra: true, diasRecompra: 30, diasInativo: 60 });
    prismaMock.venda.groupBy.mockResolvedValue([
      { clienteId: 1, _max: { dataVenda: new Date(Date.now() - 45 * 86400000) } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([{ clienteId: 1 }]);
    prismaMock.cliente.findMany.mockResolvedValue([]);
    envio.enviarWhatsApp.mockResolvedValue(true);

    await GET(req());
    const idsFinais = prismaMock.cliente.findMany.mock.calls[0]![0].where.id.in;
    expect(idsFinais).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/cron-recompra.test.ts`
Expected: FAIL — "Cannot find module '@/app/api/cron/recompra/route'"

- [ ] **Step 3: Implementar**

Criar `src/app/api/cron/recompra/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";

/**
 * Recompra: empurrão para clientes cuja última compra está na faixa
 * [diasRecompra, diasInativo) dias atrás — antes de virarem "inativos"
 * (que o cron de reativação cobre nos 60+). Cooldown via WhatsAppEnvioLog.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoRecompra) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const inicioFaixa = new Date(); // limite recente: diasRecompra atrás
    inicioFaixa.setDate(inicioFaixa.getDate() - waConfig.diasRecompra);
    inicioFaixa.setHours(23, 59, 59, 999);

    const fimFaixa = new Date(); // limite antigo: diasInativo atrás
    fimFaixa.setDate(fimFaixa.getDate() - waConfig.diasInativo);
    fimFaixa.setHours(0, 0, 0, 0);

    const cooldown = new Date();
    cooldown.setDate(cooldown.getDate() - (waConfig.diasInativo - waConfig.diasRecompra));

    const ultimaVendaPorCliente = await prisma.venda.groupBy({
      by: ["clienteId"],
      _max: { dataVenda: true },
      where: { clienteId: { not: null } },
    });

    const naFaixaIds = ultimaVendaPorCliente
      .filter((g) => {
        const d = g._max.dataVenda ? new Date(g._max.dataVenda) : null;
        return d !== null && d < inicioFaixa && d >= fimFaixa;
      })
      .map((g) => g.clienteId!);

    const recentes = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: "recompra", dataEnvio: { gte: cooldown } },
      select: { clienteId: true },
    });
    const excluirIds = new Set(recentes.map((r) => r.clienteId));
    const idsFinais = naFaixaIds.filter((id) => !excluirIds.has(id));

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: idsFinais }, telefone: { not: null } },
    });

    let enviados = 0;
    const erros: string[] = [];
    for (const c of clientes) {
      if (!c.telefone) continue;
      const msg = `Olá ${c.nome}! Já faz um tempinho desde sua última compra. Temos novidades esperando por você — quer dar uma olhada?`;
      const ok = await enviarWhatsApp({
        telefone: c.telefone,
        clienteId: c.id,
        origem: "cron",
        template: comFallback(TEMPLATES.recompra, [c.nome], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({ data: { clienteId: c.id, tipo: "recompra" } });
      } else {
        erros.push(c.nome);
      }
    }

    return NextResponse.json({ ok: true, total: clientes.length, enviados, erros: erros.length ? erros : undefined });
  } catch (error) {
    console.error("Erro no cron de recompra:", error);
    return NextResponse.json({ error: "Erro ao enviar recompra" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/cron-recompra.test.ts`
Expected: 3 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/recompra/route.ts src/__tests__/cron-recompra.test.ts
git commit -m "feat(whatsapp): cron de recompra (faixa 30-59 dias)"
```

---

### Task 5: Cron `primeira-compra` e supressão do agradecimento

**Files:**
- Create: `src/app/api/cron/primeira-compra/route.ts`
- Modify: `src/app/api/cron/agradecimento-pos-venda/route.ts`
- Test: `src/__tests__/cron-primeira-compra.test.ts`

**Interfaces:**
- Consumes: `ehPrimeiraCompra` (Task 2), `getWhatsAppFlags` (com `autoPrimeiraCompra`, `autoAgradecimento`), `enviarWhatsApp`, `TEMPLATES.primeiraCompra`, `comFallback`, `prisma`
- Produces: `GET(req: Request)` em `primeira-compra/route.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/cron-primeira-compra.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const flags = { getWhatsAppFlags: vi.fn() };
const envio = { enviarWhatsApp: vi.fn() };
const primeira = { ehPrimeiraCompra: vi.fn() };
const prismaMock = {
  venda: { findMany: vi.fn() },
  whatsAppEnvioLog: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/whatsapp", () => ({ ...flags, ...envio }));
vi.mock("@/lib/whatsapp-templates", () => ({
  TEMPLATES: { primeiraCompra: "bfx_primeira_compra" },
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/primeira-compra", () => primeira);
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/primeira-compra/route");

const req = () => new Request("http://x/api/cron/primeira-compra");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("cron primeira-compra", () => {
  it("sai cedo quando a flag está desligada", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoPrimeiraCompra: false });
    const res = await GET(req());
    expect((await res.json()).desativado).toBe(true);
  });

  it("envia só para vendas que são primeira compra", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoPrimeiraCompra: true });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } },
      { id: 11, clienteId: 2, cliente: { nome: "Bia", telefone: "5593" } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    primeira.ehPrimeiraCompra.mockImplementation(async (_c: number, vendaId: number) => vendaId === 10);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    const json = await res.json();
    expect(json.enviados).toBe(1);
    expect(envio.enviarWhatsApp).toHaveBeenCalledTimes(1);
    expect(prismaMock.whatsAppEnvioLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "primeira_compra", referencia: 10 }) })
    );
  });

  it("não reenvia venda já registrada (dedup)", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoPrimeiraCompra: true });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([{ referencia: 10 }]);
    primeira.ehPrimeiraCompra.mockResolvedValue(true);
    envio.enviarWhatsApp.mockResolvedValue(true);

    await GET(req());
    expect(envio.enviarWhatsApp).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/cron-primeira-compra.test.ts`
Expected: FAIL — "Cannot find module '@/app/api/cron/primeira-compra/route'"

- [ ] **Step 3: Implementar o cron**

Criar `src/app/api/cron/primeira-compra/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";
import { ehPrimeiraCompra } from "@/lib/primeira-compra";

const DIAS_APOS_COMPRA = 1;

/**
 * Primeira compra: mensagem especial no dia seguinte à PRIMEIRA compra do
 * cliente. Substitui o agradecimento genérico nesses casos (o agradecimento
 * exclui as primeiras compras quando esta automação está ligada).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoPrimeiraCompra) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const diaAlvo = new Date();
    diaAlvo.setDate(diaAlvo.getDate() - DIAS_APOS_COMPRA);
    const inicio = new Date(diaAlvo);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(diaAlvo);
    fim.setHours(23, 59, 59, 999);

    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: { gte: inicio, lte: fim },
        clienteId: { not: null },
        cliente: { telefone: { not: null } },
      },
      include: { cliente: { select: { nome: true, telefone: true } } },
    });

    const jaEnviados = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: "primeira_compra", referencia: { not: null } },
      select: { referencia: true },
    });
    const idsEnviados = new Set(jaEnviados.map((l) => l.referencia).filter(Boolean) as number[]);

    let enviados = 0;
    const erros: string[] = [];
    for (const v of vendas) {
      if (idsEnviados.has(v.id)) continue;
      if (!(await ehPrimeiraCompra(v.clienteId!, v.id))) continue;

      const telefone = v.cliente?.telefone;
      if (!telefone) continue;
      const clienteNome = v.cliente?.nome ?? "Cliente";
      const msg = `Olá ${clienteNome}! Que alegria ter você como cliente da BFX pela primeira vez. Qualquer coisa, é só chamar. Seja bem-vindo(a)!`;

      const ok = await enviarWhatsApp({
        telefone,
        clienteId: v.clienteId!,
        origem: "cron",
        template: comFallback(TEMPLATES.primeiraCompra, [clienteNome], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({
          data: { clienteId: v.clienteId!, tipo: "primeira_compra", referencia: v.id },
        });
      } else {
        erros.push(`Venda ${v.id} (${clienteNome})`);
      }
    }

    return NextResponse.json({ ok: true, total: vendas.length, enviados, erros: erros.length ? erros : undefined });
  } catch (error) {
    console.error("Erro no cron de primeira compra:", error);
    return NextResponse.json({ error: "Erro ao enviar primeira compra" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Rodar o teste do cron e confirmar que passa**

Run: `yarn vitest run src/__tests__/cron-primeira-compra.test.ts`
Expected: 3 testes PASS.

- [ ] **Step 5: Escrever o teste da supressão no agradecimento**

Criar `src/__tests__/cron-agradecimento-suprime.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const flags = { getWhatsAppFlags: vi.fn() };
const envio = { enviarWhatsApp: vi.fn() };
const primeira = { ehPrimeiraCompra: vi.fn() };
const prismaMock = {
  venda: { findMany: vi.fn() },
  whatsAppEnvioLog: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/whatsapp", () => ({ ...flags, ...envio }));
vi.mock("@/lib/whatsapp-templates", () => ({
  TEMPLATES: { agradecimento: "bfx_agradecimento" },
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/primeira-compra", () => primeira);
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/agradecimento-pos-venda/route");
const req = () => new Request("http://x/api/cron/agradecimento-pos-venda");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("agradecimento suprime primeira compra", () => {
  it("com primeira-compra LIGADA, exclui a venda que é primeira compra", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoAgradecimento: true, autoPrimeiraCompra: true });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } }, // primeira compra → excluir
      { id: 11, clienteId: 2, cliente: { nome: "Bia", telefone: "5593" } }, // recompra → mantém
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    primeira.ehPrimeiraCompra.mockImplementation(async (_c: number, vendaId: number) => vendaId === 10);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    expect((await res.json()).enviados).toBe(1);
    expect(envio.enviarWhatsApp).toHaveBeenCalledTimes(1);
  });

  it("com primeira-compra DESLIGADA, mantém a primeira compra no agradecimento", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoAgradecimento: true, autoPrimeiraCompra: false });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    primeira.ehPrimeiraCompra.mockResolvedValue(true);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    expect((await res.json()).enviados).toBe(1);
    expect(primeira.ehPrimeiraCompra).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Rodar o teste da supressão e confirmar a falha**

Run: `yarn vitest run src/__tests__/cron-agradecimento-suprime.test.ts`
Expected: FAIL — o primeiro caso envia 2 (ainda não exclui a primeira compra).

- [ ] **Step 7: Implementar a supressão no agradecimento**

Em `src/app/api/cron/agradecimento-pos-venda/route.ts`:

Adicionar o import no topo:

```typescript
import { ehPrimeiraCompra } from "@/lib/primeira-compra";
```

Localizar a linha que define `vendasPendentes`:

```typescript
    const vendasPendentes = vendasCompletas.filter((v) => !idsEnviados.has(v.id));
```

E inserir logo abaixo dela:

```typescript
    // Quando a primeira compra está ativa, ela assume os clientes de primeira
    // viagem — o agradecimento genérico não os envia para não duplicar.
    let vendasParaEnviar = vendasPendentes;
    if (waConfig.autoPrimeiraCompra) {
      const flags = await Promise.all(
        vendasPendentes.map((v) => ehPrimeiraCompra(v.clienteId!, v.id))
      );
      vendasParaEnviar = vendasPendentes.filter((_, i) => !flags[i]);
    }
```

Depois, trocar o laço `for (const v of vendasPendentes)` por `for (const v of vendasParaEnviar)` e, na resposta final, trocar `total: vendasPendentes.length` por `total: vendasParaEnviar.length`.

Nota: `waConfig` já é o retorno de `getWhatsAppFlags()` neste arquivo; `autoPrimeiraCompra` foi adicionado ao tipo na Task 1.

- [ ] **Step 8: Rodar os dois testes de agradecimento/primeira compra**

Run: `yarn vitest run src/__tests__/cron-agradecimento-suprime.test.ts src/__tests__/cron-primeira-compra.test.ts`
Expected: todos PASS.

- [ ] **Step 9: Rodar a suíte completa e tipos**

Run: `yarn test && yarn tsc --noEmit -p tsconfig.json`
Expected: tudo PASS; sem erros de tipo. (O teste existente `agradecimento` — se houver — não deve quebrar; a supressão só age com `autoPrimeiraCompra` verdadeiro.)

- [ ] **Step 10: Commit**

```bash
git add src/app/api/cron/primeira-compra/route.ts src/app/api/cron/agradecimento-pos-venda/route.ts src/__tests__/cron-primeira-compra.test.ts src/__tests__/cron-agradecimento-suprime.test.ts
git commit -m "feat(whatsapp): cron de primeira compra e supressao do agradecimento"
```

---

### Task 6: Cron `datas-comemorativas`

**Files:**
- Create: `src/app/api/cron/datas-comemorativas/route.ts`
- Test: `src/__tests__/cron-datas-comemorativas.test.ts`

**Interfaces:**
- Consumes: `getWhatsAppFlags` (com `autoComemorativas`, `mesesAtivoComemorativa`), `dataComemorativaDeHoje` (Task 3), `verificarCota` (`@/lib/campanha-service`), `enviarWhatsApp`, `comFallback`, `prisma`
- Produces: `GET(req: Request)` route handler

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/__tests__/cron-datas-comemorativas.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const flags = { getWhatsAppFlags: vi.fn() };
const envio = { enviarWhatsApp: vi.fn() };
const datas = { dataComemorativaDeHoje: vi.fn() };
const cota = { verificarCota: vi.fn() };
const prismaMock = {
  venda: { groupBy: vi.fn() },
  whatsAppEnvioLog: { findMany: vi.fn(), create: vi.fn() },
  cliente: { findMany: vi.fn() },
};

vi.mock("@/lib/whatsapp", () => ({ ...flags, ...envio }));
vi.mock("@/lib/whatsapp-templates", () => ({
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/datas-comemorativas", () => datas);
vi.mock("@/lib/campanha-service", () => cota);
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/datas-comemorativas/route");
const req = () => new Request("http://x/api/cron/datas-comemorativas");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("cron datas-comemorativas", () => {
  it("sai cedo quando a flag está desligada", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: false });
    expect((await GET(req()).then((r) => r.json())).desativado).toBe(true);
  });

  it("não faz nada quando hoje não é data comemorativa", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue(null);
    const json = await GET(req()).then((r) => r.json());
    expect(json.semData).toBe(true);
    expect(prismaMock.venda.groupBy).not.toHaveBeenCalled();
  });

  it("envia para clientes ativos e loga com o slug", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue({ slug: "natal", ocasiao: "Feliz Natal", template: "bfx_natal", dia: 25, mes: 12 });
    prismaMock.venda.groupBy.mockResolvedValue([
      { clienteId: 1, _max: { dataVenda: new Date() } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    prismaMock.cliente.findMany.mockResolvedValue([{ id: 1, nome: "Ana", telefone: "5592" }]);
    cota.verificarCota.mockResolvedValue({ cabe: true, disponivel: 800, usados: 0 });
    envio.enviarWhatsApp.mockResolvedValue(true);

    const json = await GET(req()).then((r) => r.json());
    expect(json.enviados).toBe(1);
    expect(json.slug).toBe("natal");
    expect(prismaMock.whatsAppEnvioLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clienteId: 1, tipo: "comemorativa_natal" }) })
    );
  });

  it("respeita a cota: envia só o disponível e reporta excedente", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue({ slug: "natal", ocasiao: "Feliz Natal", template: "bfx_natal", dia: 25, mes: 12 });
    prismaMock.venda.groupBy.mockResolvedValue([1, 2, 3].map((id) => ({ clienteId: id, _max: { dataVenda: new Date() } })));
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    prismaMock.cliente.findMany.mockResolvedValue([
      { id: 1, nome: "A", telefone: "1" },
      { id: 2, nome: "B", telefone: "2" },
      { id: 3, nome: "C", telefone: "3" },
    ]);
    cota.verificarCota.mockResolvedValue({ cabe: false, disponivel: 2, usados: 998 });
    envio.enviarWhatsApp.mockResolvedValue(true);

    const json = await GET(req()).then((r) => r.json());
    expect(json.enviados).toBe(2);
    expect(json.excedente).toBe(1);
    expect(envio.enviarWhatsApp).toHaveBeenCalledTimes(2);
  });

  it("exclui quem já recebeu a comemorativa hoje (dedup)", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue({ slug: "natal", ocasiao: "Feliz Natal", template: "bfx_natal", dia: 25, mes: 12 });
    prismaMock.venda.groupBy.mockResolvedValue([{ clienteId: 1, _max: { dataVenda: new Date() } }]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([{ clienteId: 1 }]);
    prismaMock.cliente.findMany.mockResolvedValue([]);
    cota.verificarCota.mockResolvedValue({ cabe: true, disponivel: 800, usados: 0 });

    await GET(req());
    const idsFinais = prismaMock.cliente.findMany.mock.calls[0]![0].where.id.in;
    expect(idsFinais).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `yarn vitest run src/__tests__/cron-datas-comemorativas.test.ts`
Expected: FAIL — "Cannot find module '@/app/api/cron/datas-comemorativas/route'"

- [ ] **Step 3: Implementar**

Criar `src/app/api/cron/datas-comemorativas/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsApp, getWhatsAppFlags } from "@/lib/whatsapp";
import { comFallback } from "@/lib/whatsapp-templates";
import { dataComemorativaDeHoje } from "@/lib/datas-comemorativas";
import { verificarCota } from "@/lib/campanha-service";

/**
 * Datas comemorativas fixas: no dia certo, envia para clientes ativos
 * (compraram nos últimos `mesesAtivoComemorativa` meses), respeitando a cota
 * da Meta. Como é marketing, envia só até o disponível e loga o excedente,
 * preservando a reserva transacional.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppFlags();
    if (!waConfig?.autoComemorativas) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const data = dataComemorativaDeHoje(new Date());
    if (!data) {
      return NextResponse.json({ ok: true, enviados: 0, semData: true });
    }

    const desdeAtivo = new Date();
    desdeAtivo.setMonth(desdeAtivo.getMonth() - waConfig.mesesAtivoComemorativa);

    const ultimaVendaPorCliente = await prisma.venda.groupBy({
      by: ["clienteId"],
      _max: { dataVenda: true },
      where: { clienteId: { not: null } },
    });

    const ativosIds = ultimaVendaPorCliente
      .filter((g) => g._max.dataVenda && new Date(g._max.dataVenda) >= desdeAtivo)
      .map((g) => g.clienteId!);

    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const jaEnviados = await prisma.whatsAppEnvioLog.findMany({
      where: { tipo: `comemorativa_${data.slug}`, dataEnvio: { gte: inicioHoje } },
      select: { clienteId: true },
    });
    const excluir = new Set(jaEnviados.map((l) => l.clienteId));
    const idsFinais = ativosIds.filter((id) => !excluir.has(id));

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: idsFinais }, telefone: { not: null } },
    });

    // Respeita a cota da Meta: envia só até o disponível.
    const cota = await verificarCota(clientes.length);
    const aEnviar = clientes.slice(0, cota.disponivel);
    const excedente = clientes.length - aEnviar.length;

    let enviados = 0;
    const erros: string[] = [];
    for (const c of aEnviar) {
      if (!c.telefone) continue;
      const msg = `Olá ${c.nome}! ${data.ocasiao}! A BFX deseja tudo de bom para você. 🎉`;
      const ok = await enviarWhatsApp({
        telefone: c.telefone,
        clienteId: c.id,
        origem: "cron",
        template: comFallback(data.template, [c.nome], msg),
      });
      if (ok) {
        enviados++;
        await prisma.whatsAppEnvioLog.create({
          data: { clienteId: c.id, tipo: `comemorativa_${data.slug}` },
        });
      } else {
        erros.push(c.nome);
      }
    }

    if (excedente > 0) {
      console.warn(`[comemorativa/${data.slug}] ${excedente} clientes fora da cota de 24h (disponível: ${cota.disponivel}).`);
    }

    return NextResponse.json({
      ok: true,
      slug: data.slug,
      total: clientes.length,
      enviados,
      excedente,
      erros: erros.length ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro no cron de datas comemorativas:", error);
    return NextResponse.json({ error: "Erro ao enviar comemorativa" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `yarn vitest run src/__tests__/cron-datas-comemorativas.test.ts`
Expected: 5 testes PASS.

- [ ] **Step 5: Rodar a suíte completa**

Run: `yarn test && yarn tsc --noEmit -p tsconfig.json`
Expected: tudo PASS, sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/datas-comemorativas/route.ts src/__tests__/cron-datas-comemorativas.test.ts
git commit -m "feat(whatsapp): cron de datas comemorativas com respeito a cota"
```

---

### Task 7: CronJobs do Kubernetes e documentação

**Files:**
- Modify: `deploy/bfx/cronjobs-app.yaml`
- Modify: `docs/whatsapp-cloud-api.md`

**Interfaces:**
- Consumes: as 3 rotas de cron criadas (recompra, primeira-compra, datas-comemorativas)
- Produces: 3 CronJobs; seção de doc dos novos gatilhos + templates a aprovar

- [ ] **Step 1: Adicionar os 3 CronJobs**

Em `deploy/bfx/cronjobs-app.yaml`, ao fim do arquivo, adicionar 3 blocos (um por cron), seguindo exatamente o formato do `bfx-reativacao-inativos`. Para cada um, trocar apenas o nome e o path. Recompra:

```yaml
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: bfx-recompra
  labels:
    app: bfx-recompra
spec:
  schedule: "0 11 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        metadata:
          labels:
            app: bfx-recompra
        spec:
          restartPolicy: OnFailure
          containers:
            - name: curl-cron
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  set -e
                  response=$(curl -sf -w "\n%{http_code}" \
                    -H "Authorization: Bearer $CRON_SECRET" \
                    "$APP_URL/api/cron/recompra")
                  http_code=$(echo "$response" | tail -n1)
                  body=$(echo "$response" | sed '$d')
                  echo "HTTP $http_code - $body"
                  [ "$http_code" = "200" ] || exit 1
              env:
                - name: CRON_SECRET
                  valueFrom:
                    secretKeyRef:
                      name: bfx-app-secrets
                      key: CRON_SECRET
                - name: APP_URL
                  value: "http://bfx-app"
```

Repetir para `bfx-primeira-compra` (`schedule: "30 9 * * *"`, path `/api/cron/primeira-compra`) e `bfx-datas-comemorativas` (`schedule: "0 8 * * *"`, path `/api/cron/datas-comemorativas`), trocando `name`, `labels.app`, o path do curl e o schedule.

- [ ] **Step 2: Documentar os novos gatilhos e templates**

Em `docs/whatsapp-cloud-api.md`, adicionar a seção:

```markdown
## Novos gatilhos (recompra, primeira compra, comemorativas)

Três automações adicionais, todas dormentes por padrão (flag `Config` = 0):

- **Recompra** (`whatsappAutoRecompra`, `whatsappDiasRecompra` padrão 30) — cron
  `/api/cron/recompra`. Cliente cuja última compra está na faixa
  [diasRecompra, diasInativo) dias atrás. Não colide com reativação (60+).
- **Primeira compra** (`whatsappAutoPrimeiraCompra`) — cron
  `/api/cron/primeira-compra`. Dia seguinte à 1ª compra do cliente. Quando
  ligada, o agradecimento genérico deixa de enviar a essas vendas.
- **Datas comemorativas** (`whatsappAutoComemorativas`,
  `whatsappMesesAtivoComemorativa` padrão 6) — cron `/api/cron/datas-comemorativas`.
  6 datas fixas (Ano Novo, Dia das Mulheres, Namorados, Cliente, Crianças, Natal).
  Só clientes ativos; respeita a cota de 24h (envia o disponível, loga o excedente).

### Templates a aprovar na Meta (8)

Transacionais (utilitário): `bfx_recompra`, `bfx_primeira_compra`.
Marketing: `bfx_natal`, `bfx_ano_novo`, `bfx_dia_cliente`, `bfx_dia_criancas`,
`bfx_dia_namorados`, `bfx_dia_mulheres`. Os nomes devem bater com o registry em
`src/lib/whatsapp-templates.ts`. Ligar cada flag só após o template aprovado.
```

- [ ] **Step 3: Verificação final**

Run: `yarn test && yarn tsc --noEmit -p tsconfig.json && yarn lint`
Expected: testes PASS, tsc limpo. `yarn lint` pode ter o erro pré-existente em `src/components/historico-antecipacoes.tsx` (não é desta feature) — nenhum erro novo.

- [ ] **Step 4: Commit**

```bash
git add deploy/bfx/cronjobs-app.yaml docs/whatsapp-cloud-api.md
git commit -m "chore(whatsapp): cronjobs k8s e docs dos novos gatilhos"
```

---

## Notas de execução

- **Ordem de dependências:** Task 1 → (2, 3 em paralelo lógico) → 4, 5, 6 → 7. Task 5 depende de 2; Task 6 depende de 3. Todas dependem das flags/templates da Task 1.
- **Nada liga automação.** Todas as flags entram default 0; a virada é operacional (ligar a flag no Config só depois do template aprovado na Meta).
- **Migration:** a Task 1 gera uma migration com 5 ADD COLUMN. Confirmar que não captura drift antes de commitar (o `bfx_dev` já está sincronizado, então não deve).
