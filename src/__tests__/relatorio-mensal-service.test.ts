import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbMock: {
    config: { findFirst: vi.fn() },
    empresaParceira: { findMany: vi.fn() },
    empresaVinculo: { findMany: vi.fn() },
    venda: { findMany: vi.fn() },
    relatorioEnvioLog: { findUnique: vi.fn(), upsert: vi.fn() },
    notificacao: { create: vi.fn() },
  },
  sendEmail: vi.fn(),
  gerarPlanilhaAntecipacao: vi.fn(),
  gerarPlanilhaModeloOficial: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.dbMock }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/relatorio-mensal-xlsx", () => ({
  gerarPlanilhaAntecipacao: mocks.gerarPlanilhaAntecipacao,
  gerarRelatorioMensalXlsx: vi.fn(),
  XLSX_MIME: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}));
vi.mock("@/lib/relatorio-mensal-oficial-xls", () => ({ gerarPlanilhaModeloOficial: mocks.gerarPlanilhaModeloOficial }));
vi.mock("@/lib/relatorio-mensal-pdf", () => ({ gerarRelatorioMensalPdf: vi.fn() }));

import { processarRelatorioMensal } from "@/lib/relatorio-mensal-service";
import { periodoAtualManausBoundaries } from "@/lib/relatorio-mensal";

const { dbMock, sendEmail, gerarPlanilhaAntecipacao, gerarPlanilhaModeloOficial } = mocks;

const INICIO_SETEMBRO = new Date("2026-09-01T04:00:00.000Z");
const FIM_DIA_22_SETEMBRO = new Date("2026-09-23T03:59:59.999Z");

function venda() {
  return {
    id: 11,
    dataVenda: new Date("2026-09-18T14:00:00.000Z"),
    formaPagamento: "DESCONTO_FOLHA",
    parcelas: 1,
    valorVenda: 300,
    cliente: {
      id: 21,
      nome: "Ana Silva",
      cpf: "123.456.789-00",
      matricula: "001",
      empresa: "Empresa Prime",
    },
    itens: [{ produtoNome: "Notebook", quantidade: 1, subtotal: 300 }],
    parcelasVencimento: [
      { numeroParcela: 1, dataVencimento: new Date("2026-10-10T04:00:00.000Z"), valorParcela: 300 },
    ],
  };
}

function configurarEmpresa(emailRh: string | null = "rh@empresa.test") {
  dbMock.config.findFirst.mockResolvedValue(null);
  dbMock.empresaParceira.findMany.mockResolvedValue([
    {
      id: 7,
      nome: "Empresa Prime",
      emailRh,
      emailsExtras: "extra@empresa.test",
      telefoneRh: "5592999999999",
    },
  ]);
  dbMock.empresaVinculo.findMany.mockResolvedValue([]);
  dbMock.relatorioEnvioLog.findUnique.mockResolvedValue(null);
  dbMock.relatorioEnvioLog.upsert.mockResolvedValue({});
  dbMock.notificacao.create.mockResolvedValue({});
  gerarPlanilhaAntecipacao.mockReturnValue(Buffer.from("antecipacao"));
  gerarPlanilhaModeloOficial.mockReturnValue(Buffer.from("oficial"));
  sendEmail.mockResolvedValue(undefined);
}

describe("processarRelatorioMensal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configurarEmpresa();
  });

  it("envia os dois consolidadores ao emailRh no recorte parcial atual", async () => {
    dbMock.venda.findMany.mockResolvedValue([venda()]);

    const resultado = await processarRelatorioMensal({
      periodo: "2026-09",
      inicio: INICIO_SETEMBRO,
      fim: FIM_DIA_22_SETEMBRO,
    });

    expect(dbMock.venda.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dataVenda: { gte: INICIO_SETEMBRO, lte: FIM_DIA_22_SETEMBRO },
        }),
      })
    );
    expect(gerarPlanilhaAntecipacao).toHaveBeenCalledWith(
      [expect.objectContaining({ nome: "Ana Silva", cpf: "123.456.789-00", empresa: "Empresa Prime", produto: "Notebook", valorAcumulado: 300 })],
      "2026-09"
    );
    expect(gerarPlanilhaModeloOficial).toHaveBeenCalledWith(
      [expect.objectContaining({ nome: "Ana Silva", produto: "Notebook" })],
      "2026-09"
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "rh@empresa.test",
        attachments: [
          expect.objectContaining({ filename: "antecipacao-empresa-prime-2026-09.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: Buffer.from("antecipacao") }),
          expect.objectContaining({ filename: "relatorio-oficial-empresa-prime-2026-09.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: Buffer.from("oficial") }),
        ],
      })
    );
    expect(sendEmail.mock.calls[0]![0]).not.toHaveProperty("cc");
    expect(dbMock.relatorioEnvioLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "enviado", destinatarios: "rh@empresa.test", totalVendas: 1, valorTotal: 300 }),
      })
    );
    expect(resultado.resultados).toEqual([
      expect.objectContaining({ empresaId: 7, status: "enviado", totalVendas: 1, valorTotal: 300 }),
    ]);
  });

  it("registra sem_email sem enviar quando a empresa canonica nao tem emailRh", async () => {
    configurarEmpresa(null);
    dbMock.venda.findMany.mockResolvedValue([venda()]);

    const resultado = await processarRelatorioMensal({ periodo: "2026-09" });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(dbMock.relatorioEnvioLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: "sem_email", totalVendas: 1, valorTotal: 300 }) })
    );
    expect(resultado.resultados[0]).toMatchObject({ status: "sem_email", totalVendas: 1, valorTotal: 300 });
  });

  it("registra sem_vendas sem gerar anexos quando nao ha vendas no periodo", async () => {
    dbMock.venda.findMany.mockResolvedValue([]);

    const resultado = await processarRelatorioMensal({ periodo: "2026-09" });

    expect(gerarPlanilhaAntecipacao).not.toHaveBeenCalled();
    expect(gerarPlanilhaModeloOficial).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(dbMock.relatorioEnvioLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: "sem_vendas", totalVendas: 0, valorTotal: 0 }) })
    );
    expect(resultado.resultados[0]).toMatchObject({ status: "sem_vendas", totalVendas: 0, valorTotal: 0 });
  });

  it("registra erro quando o envio ao emailRh falha", async () => {
    dbMock.venda.findMany.mockResolvedValue([venda()]);
    sendEmail.mockRejectedValue(new Error("SMTP indisponivel"));

    const resultado = await processarRelatorioMensal({ periodo: "2026-09" });

    expect(dbMock.relatorioEnvioLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: "erro", erro: "SMTP indisponivel", totalVendas: 1, valorTotal: 300 }) })
    );
    expect(resultado.resultados[0]).toMatchObject({ status: "erro", erro: "SMTP indisponivel" });
  });

  it("preserva force para reenviar manualmente um periodo ja enviado", async () => {
    dbMock.venda.findMany.mockResolvedValue([venda()]);
    dbMock.relatorioEnvioLog.findUnique.mockResolvedValue({ status: "enviado", totalVendas: 1, valorTotal: 300 });

    const resultado = await processarRelatorioMensal({ periodo: "2026-08", empresaId: 7, force: true });

    expect(dbMock.relatorioEnvioLog.findUnique).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(resultado.resultados[0]).toMatchObject({ status: "enviado" });
  });
});

describe("periodoAtualManausBoundaries", () => {
  it("converte a data de referencia de Manaus em inicio do mes e fim do dia UTC", () => {
    expect(periodoAtualManausBoundaries(new Date("2026-09-22T12:00:00.000Z"))).toEqual({
      inicio: INICIO_SETEMBRO,
      fim: FIM_DIA_22_SETEMBRO,
    });
  });
});
