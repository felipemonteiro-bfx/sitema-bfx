// Telas da baixa de parcelas: regra de exibicao, token do webhook e status (2026-09-17).
// Desenho aprovado: https://claude.ai/artifact/GJLH94z5xEt8H5xeNPAGVh
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  linhaRecebimento,
  resumoRecebimento,
  temParcelaRepetida,
  totalParcelasExibido,
  type ParcelaRecebimento,
} from "@/lib/recebimento-parcelas";
import {
  formatarUltimoAviso,
  gerarTokenWebhook,
  mascararToken,
  statusWebhookAsaas,
  urlWebhookAsaas,
} from "@/lib/webhook-asaas-token";

function parcela(over: Partial<ParcelaRecebimento> = {}): ParcelaRecebimento {
  return {
    id: 1,
    numeroParcela: 1,
    totalParcelas: 6,
    dataVencimento: "2026-10-10",
    valorParcela: 386.66,
    paga: false,
    dataPagamento: null,
    origemPagamento: null,
    baixaPor: null,
    ...over,
  };
}

describe("linhaRecebimento", () => {
  const HOJE = "2026-09-16";

  it("Prudent: paga, antecipada, e desfazer pede confirmacao", () => {
    expect(linhaRecebimento(parcela({ paga: true, origemPagamento: "prudent" }), HOJE)).toEqual({
      situacao: "paga",
      diasAtraso: 0,
      origemTitulo: "Prudent",
      origemDetalhe: "Antecipada",
      desfazerPedeConfirmacao: true,
    });
  });

  it("Asaas: boleto pago na data; Manual: data e quem deu a baixa, sem confirmacao", () => {
    expect(
      linhaRecebimento(parcela({ paga: true, origemPagamento: "asaas", dataPagamento: "2026-10-08" }), HOJE),
    ).toMatchObject({ origemTitulo: "Asaas", origemDetalhe: "Boleto pago em 08/10/2026", desfazerPedeConfirmacao: true });
    expect(
      linhaRecebimento(
        parcela({ paga: true, origemPagamento: "manual", dataPagamento: "2026-11-12", baixaPor: "André" }),
        HOJE,
      ),
    ).toMatchObject({ origemTitulo: "Manual", origemDetalhe: "12/11/2026 · por André", desfazerPedeConfirmacao: false });
  });

  it("vencida conta os dias de atraso; vence hoje ainda esta em aberto", () => {
    expect(linhaRecebimento(parcela({ dataVencimento: "2026-08-10" }), HOJE)).toMatchObject({
      situacao: "vencida",
      diasAtraso: 37,
      origemTitulo: null,
    });
    expect(linhaRecebimento(parcela({ dataVencimento: HOJE }), HOJE)).toMatchObject({ situacao: "em_aberto", diasAtraso: 0 });
  });

  it("paga sem origem (dado antigo) ainda mostra a data", () => {
    expect(
      linhaRecebimento(parcela({ paga: true, dataPagamento: "2026-09-01" }), HOJE),
    ).toMatchObject({ situacao: "paga", origemTitulo: "Baixa", origemDetalhe: "01/09/2026" });
  });
});

describe("resumoRecebimento", () => {
  it("soma o recebido e o total em centavos", () => {
    expect(
      resumoRecebimento([
        parcela({ paga: true, valorParcela: 386.66 }),
        parcela({ paga: true, valorParcela: 386.66 }),
        parcela({ valorParcela: 386.64 }),
      ]),
    ).toEqual({ recebido: 773.32, total: 1159.96 });
  });
});

describe("vendas com linhas de parcela inconsistentes (ex.: 51-53)", () => {
  it("total exibido nunca fica menor que o maior numero de parcela", () => {
    expect(totalParcelasExibido(6, [1, 2, 3, 4, 5, 6])).toBe(6);
    expect(totalParcelasExibido(1, [1, 2, 3])).toBe(3);
    expect(totalParcelasExibido(null, [1, 2])).toBe(2);
    expect(totalParcelasExibido(0, [])).toBe(1);
  });

  it("detecta numero de parcela repetido", () => {
    expect(temParcelaRepetida([parcela({ numeroParcela: 1 }), parcela({ numeroParcela: 2 })])).toBe(false);
    expect(temParcelaRepetida([parcela({ numeroParcela: 2 }), parcela({ numeroParcela: 2 })])).toBe(true);
  });
});

describe("token do webhook", () => {
  it("gera 48 caracteres base64url sem tres iguais seguidos, e cada chamada muda", () => {
    const a = gerarTokenWebhook();
    const b = gerarTokenWebhook();
    expect(a).toHaveLength(48);
    expect(a).not.toBe(b);
    expect(a.split("").every((c) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".includes(c))).toBe(true);
    for (let i = 2; i < a.length; i++) expect(a[i] === a[i - 1] && a[i] === a[i - 2]).toBe(false);
  });

  it("mascara mostrando so os 4 ultimos", () => {
    expect(mascararToken("abcdefghij1234")).toBe("••••••••••1234");
    expect(mascararToken(null)).toBeNull();
  });

  it("status: sem token, falta cadastrar, recebendo avisos", () => {
    expect(statusWebhookAsaas({ token: null, ultimoAvisoEm: null })).toBe("sem_token");
    expect(statusWebhookAsaas({ token: "x", ultimoAvisoEm: null })).toBe("falta_cadastrar");
    expect(statusWebhookAsaas({ token: "x", ultimoAvisoEm: new Date() })).toBe("recebendo");
  });
});

const dbMock = { config: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() } };
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { gerarTokenWebhookAsaas, lerTokenWebhookAsaas } = await import("@/app/(app)/configuracoes/asaas-webhook-actions");

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "andre", role: "admin" });
  dbMock.config.findFirst.mockResolvedValue({ id: 3 });
  dbMock.config.updateMany.mockResolvedValue({ count: 1 });
});

describe("gerarTokenWebhookAsaas", () => {
  it("exige admin antes de gravar", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(gerarTokenWebhookAsaas()).rejects.toThrow("Acesso negado.");
    expect(dbMock.config.updateMany).not.toHaveBeenCalled();
  });

  it("grava um token novo e zera o ultimo aviso (o Asaas precisa ser atualizado)", async () => {
    const r = await gerarTokenWebhookAsaas();
    expect(r.success).toBe(true);
    const data = dbMock.config.updateMany.mock.calls[0][0].data;
    expect(data.asaasWebhookToken).toHaveLength(48);
    expect(data.asaasWebhookUltimoAvisoEm).toBeNull();
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("config:asaas-webhook-token", expect.anything());
    expect(JSON.stringify(auditMock.createAuditLog.mock.calls[0])).not.toContain(data.asaasWebhookToken);
  });

  it("sem linha de config cria uma", async () => {
    dbMock.config.findFirst.mockResolvedValue(null);
    await gerarTokenWebhookAsaas();
    expect(dbMock.config.create).toHaveBeenCalled();
  });
});

describe("lerTokenWebhookAsaas", () => {
  it("so admin le o token completo (a pagina so recebe o mascarado)", async () => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(lerTokenWebhookAsaas()).rejects.toThrow("Acesso negado.");
    expect(dbMock.config.findFirst).not.toHaveBeenCalled();
  });

  it("devolve o token gravado, ou erro quando ainda nao foi gerado", async () => {
    dbMock.config.findFirst.mockResolvedValue({ asaasWebhookToken: "tok-completo-abcd" });
    expect(await lerTokenWebhookAsaas()).toEqual({ success: true, token: "tok-completo-abcd" });
    dbMock.config.findFirst.mockResolvedValue({ asaasWebhookToken: null });
    expect(await lerTokenWebhookAsaas()).toMatchObject({ success: false });
  });
});

describe("formatarUltimoAviso", () => {
  it("data e hora em Manaus", () => {
    expect(formatarUltimoAviso(new Date("2026-09-17T18:05:00.000Z"))).toBe("17/09/2026 às 14:05");
  });
});

describe("urlWebhookAsaas", () => {
  it("usa o endereco configurado, sem barra final", () => {
    expect(urlWebhookAsaas("https://bfx.softlive.dev/", "outro.host")).toBe("https://bfx.softlive.dev/api/webhooks/asaas");
  });

  it("sem endereco configurado usa o host da requisicao sempre em https, exceto localhost", () => {
    expect(urlWebhookAsaas(undefined, "bfx.exemplo.com")).toBe("https://bfx.exemplo.com/api/webhooks/asaas");
    expect(urlWebhookAsaas("", "localhost:3008")).toBe("http://localhost:3008/api/webhooks/asaas");
    expect(urlWebhookAsaas(undefined, null)).toBe("/api/webhooks/asaas");
  });
});

describe("ligacao das telas", () => {
  const ler = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  it("ficha da venda mostra o recebimento e so admin recebe as acoes", () => {
    const pagina = ler("src/app/(app)/historico/page.tsx");
    expect(pagina.includes("podeDarBaixa")).toBe(true);
    expect(ler("src/components/edit-venda-historico-form.tsx").includes("<RecebimentoParcelas")).toBe(true);
  });

  it("configuracoes mostra o card do webhook do Asaas", () => {
    expect(ler("src/app/(app)/configuracoes/page.tsx").includes("<WebhookAsaasCard")).toBe(true);
  });

  it("webhook autenticado registra o ultimo aviso", () => {
    expect(ler("src/app/api/webhooks/asaas/route.ts").includes("registrarAvisoWebhookAsaas(")).toBe(true);
  });
});
