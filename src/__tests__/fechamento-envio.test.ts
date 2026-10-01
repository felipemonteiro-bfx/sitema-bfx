// Envio do demonstrativo ao RH (Fase 5): exige fechamento conferido e e-mail do RH, gera o PDF da
// versão atual, manda PDF + XLSX, registra no histórico (tipo "fechamento") e só depois marca
// enviado. Fase 6: antes, encerra as cobranças das versões anteriores e gera o Pix do saldo no
// Asaas (mockado) — copia-e-cola no corpo e o QR em anexo.
// Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §5.2.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  fechamento: { findUnique: vi.fn() },
  arquivoFinanceiro: { create: vi.fn() },
  config: { findFirst: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
const emailMock = { sendEmail: vi.fn() };
vi.mock("@/lib/email", () => emailMock);
const regraMock = { regrasDaEmpresa: vi.fn() };
vi.mock("@/lib/regra-empresa-db", () => regraMock);
const fechDbMock = { marcarEnviado: vi.fn(), reivindicarEnvio: vi.fn(), desfazerReivindicacao: vi.fn() };
const asaasMock = { getOrCreateCustomerEmpresa: vi.fn() };
vi.mock("@/lib/asaas", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/asaas")>();
  return { ...real, ...asaasMock };
});
const cobrancaMock = { encerrarCobrancasAnteriores: vi.fn(), garantirCobrancaPix: vi.fn() };
vi.mock("@/lib/cobranca-fechamento-db", () => cobrancaMock);
const recMock = { recalcularEAvisar: vi.fn() };
vi.mock("@/lib/recebimento-fechamento-db", () => recMock);
const pdfSpy = vi.fn();
vi.mock("@/lib/fechamento-pdf", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/fechamento-pdf")>();
  return {
    ...real,
    gerarFechamentoPdf: (input: Parameters<typeof real.gerarFechamentoPdf>[0]) => {
      pdfSpy(input);
      return real.gerarFechamentoPdf(input);
    },
  };
});
vi.mock("@/lib/fechamento-db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/fechamento-db")>();
  return { ...real, ...fechDbMock };
});

const { enviarFechamento, htmlEmailFechamento } = await import("@/lib/fechamento-envio");
const { ROTULO_TIPO_EMAIL } = await import("@/lib/email-tipos");

const XLSX = Buffer.from("PK\u0003\u0004fake");
// PNG 1×1 válido: o PDF embute o QR.
const QR = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const COPIA_E_COLA = "00020101021226820014br.gov.bcb.pix2560qrpix.bradesco.com.br/qr/v2/cobv/abc5204000053039865406450.005802BR6304ABCD";
const PIX = {
  cobrancaId: 8,
  asaasPaymentId: "pay_v2",
  copiaECola: COPIA_E_COLA,
  qrPng: new Uint8Array(QR),
  valor: 450,
  vencimento: new Date("2026-10-15T00:00:00Z"),
  identificacao: "FEC-7-2026-10-v2",
};

function fechamento(extra: Record<string, unknown> = {}) {
  return {
    id: 11,
    status: "conferido",
    competencia: "2026-10",
    versaoAtual: 2,
    responsavel: "andre",
    empresaParceiraId: 7,
    empresaParceira: {
      id: 7,
      nome: "Amazon Five <Ltda>",
      cnpj: "12.345.678/0001-90",
      emailRh: " rh@amazonfive.com.br ",
      emailCopia: "financeiro@amazonfive.com.br",
      asaasCustomerId: "cus_9",
    },
    versoes: [
      {
        id: 900,
        numero: 2,
        totalBruto: 500,
        totalAjustes: -50,
        totalFinal: 450,
        ajustesJson: JSON.stringify([{ valor: -50, justificativa: "Desconto combinado" }]),
        xlsx: { nome: "demonstrativo-amazon-five-ltda-2026-10-v2.xlsx", conteudo: XLSX },
        linhas: [
          {
            vendaId: 240, numeroParcela: 3, totalParcelas: 4, clienteNome: "ANA SOUZA", matricula: "0042",
            valor: 300, vencimento: new Date("2026-10-10T00:00:00Z"), loteId: null, antecipada: false,
          },
          {
            vendaId: 250, numeroParcela: 1, totalParcelas: 2, clienteNome: "BRUNO LIMA", matricula: null,
            valor: 200, vencimento: new Date("2026-10-10T00:00:00Z"), loteId: 5, antecipada: true,
          },
        ],
      },
    ],
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.fechamento.findUnique.mockResolvedValue(fechamento());
  dbMock.arquivoFinanceiro.create.mockResolvedValue({ id: 55 });
  dbMock.config.findFirst.mockResolvedValue({ logoPath: null, asaasApiKey: "k", asaasEnv: null });
  asaasMock.getOrCreateCustomerEmpresa.mockResolvedValue("cus_9");
  cobrancaMock.encerrarCobrancasAnteriores.mockResolvedValue(undefined);
  cobrancaMock.garantirCobrancaPix.mockResolvedValue({ pix: PIX, recebido: 0, saldo: 450 });
  recMock.recalcularEAvisar.mockResolvedValue(null);
  emailMock.sendEmail.mockResolvedValue(undefined);
  fechDbMock.marcarEnviado.mockResolvedValue(undefined);
  fechDbMock.reivindicarEnvio.mockResolvedValue(undefined);
  fechDbMock.desfazerReivindicacao.mockResolvedValue(undefined);
  regraMock.regrasDaEmpresa.mockResolvedValue([
    {
      vigenteDe: new Date("2026-01-01T00:00:00Z"), vigenteAte: null, diaCorte: 20, diaVencimento: 10, diaPix: 15,
      repassePct: null, repasseBase: null, cobrancaViaBfx: true,
    },
  ]);
});

describe("tipo de e-mail", () => {
  it("o histórico conhece o tipo fechamento", () => {
    expect(ROTULO_TIPO_EMAIL.fechamento).toBe("Demonstrativo mensal");
  });
});

describe("enviarFechamento — Pix (Fase 6)", () => {
  it("gera o Pix pelo saldo e o põe no PDF e no e-mail: copia-e-cola numa linha só, QR em anexo", async () => {
    await enviarFechamento({ fechamentoId: 11, versao: 2, usuario: "andre" });

    expect(asaasMock.getOrCreateCustomerEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, cnpj: "12.345.678/0001-90", asaasCustomerId: "cus_9" }),
      expect.anything(),
      { baseUrl: expect.any(String), apiKey: "k" }
    );
    expect(cobrancaMock.encerrarCobrancasAnteriores).toHaveBeenCalledWith({ fechamentoId: 11, versaoId: 900, config: expect.anything() });
    expect(cobrancaMock.garantirCobrancaPix).toHaveBeenCalledWith(
      expect.objectContaining({ fechamentoId: 11, versaoId: 900, versao: 2, empresaId: 7, customerId: "cus_9", totalFinal: 450, diaPix: 15, competencia: "2026-10" })
    );
    // anteriores encerradas antes de reivindicar; a cobrança nova só depois (um envio só cria)
    const ordem = (f: { mock: { invocationCallOrder: number[] } }) => f.mock.invocationCallOrder[0];
    expect(ordem(cobrancaMock.encerrarCobrancasAnteriores)).toBeLessThan(ordem(fechDbMock.reivindicarEnvio));
    expect(ordem(fechDbMock.reivindicarEnvio)).toBeLessThan(ordem(cobrancaMock.garantirCobrancaPix));
    expect(ordem(cobrancaMock.garantirCobrancaPix)).toBeLessThan(ordem(emailMock.sendEmail));

    expect(pdfSpy.mock.calls[0][0].pix).toEqual({
      copiaECola: COPIA_E_COLA,
      qrPng: PIX.qrPng,
      vencimento: PIX.vencimento,
      identificacao: "FEC-7-2026-10-v2",
      valor: 450,
    });

    const email = emailMock.sendEmail.mock.calls[0][0];
    const png = email.attachments.find((a: { filename: string }) => a.filename === "pix-2026-10.png");
    expect(png.contentType).toBe("image/png");
    expect(Buffer.from(png.content).equals(QR)).toBe(true);
    const html: string = email.html;
    // o copia-e-cola inteiro, contíguo, num bloco monoespaçado que não quebra
    const bloco = html.split("\n").find((l) => l.includes(COPIA_E_COLA)) ?? "";
    expect(bloco).toContain("monospace");
    expect(bloco).toContain("white-space:nowrap");
    expect(bloco).not.toContain("<br");
    expect(html).toContain("Vencimento do Pix: 15/10/2026");
    expect(html).toContain("FEC-7-2026-10-v2");
    expect(recMock.recalcularEAvisar).toHaveBeenCalledWith(11);
    expect(ordem(recMock.recalcularEAvisar)).toBeGreaterThan(ordem(fechDbMock.marcarEnviado));
  });

  it("copia-e-cola com quebra de linha vira uma linha só no e-mail", () => {
    const html = htmlEmailFechamento({
      empresa: "X",
      competencia: "2026-10",
      versao: 1,
      totalFinal: 10,
      vencimentoPix: new Date("2026-10-15T00:00:00Z"),
      anexos: [],
      pix: { copiaECola: "0002\r\n0101\u2028FIM", valor: 10, identificacao: "FEC-1-2026-10-v1" },
      recebido: 0,
    });
    expect(html).toContain("00020101FIM");
  });

  it("já recebido parte: o e-mail mostra o recebido e o valor do Pix (saldo)", async () => {
    cobrancaMock.garantirCobrancaPix.mockResolvedValue({ pix: { ...PIX, valor: 300 }, recebido: 150, saldo: 300 });
    await enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null });
    const html: string = emailMock.sendEmail.mock.calls[0][0].html;
    expect(html).toMatch(/Já recebido[^<]*<\/p>\s*<p[^>]*>R\$\s?150,00/);
    expect(html).toMatch(/Valor do Pix[^<]*<\/p>\s*<p[^>]*>R\$\s?300,00/);
  });

  it("saldo zero: sem cobrança, sem anexo do QR, e-mail diz que não há o que pagar", async () => {
    cobrancaMock.garantirCobrancaPix.mockResolvedValue({ pix: null, recebido: 450, saldo: 0 });
    await enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null });
    const email = emailMock.sendEmail.mock.calls[0][0];
    expect(email.attachments).toHaveLength(2);
    expect(email.html).toContain("Nada a pagar");
    expect(pdfSpy.mock.calls[0][0].pix).toBeNull();
  });

  it("Asaas sem configuração → erro antes de qualquer gravação ou chamada", async () => {
    dbMock.config.findFirst.mockResolvedValue({ logoPath: null, asaasApiKey: null, asaasEnv: null });
    await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow(
      "Configure o Asaas em Configurações para gerar o Pix."
    );
    expect(asaasMock.getOrCreateCustomerEmpresa).not.toHaveBeenCalled();
    expect(cobrancaMock.encerrarCobrancasAnteriores).not.toHaveBeenCalled();
    expect(fechDbMock.reivindicarEnvio).not.toHaveBeenCalled();
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("empresa sem CNPJ → recusa antes de criar nada", async () => {
    const f = fechamento();
    dbMock.fechamento.findUnique.mockResolvedValue({ ...f, empresaParceira: { ...f.empresaParceira, cnpj: null, asaasCustomerId: null } });
    await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow("Cadastre o CNPJ da empresa para gerar o Pix.");
    expect(asaasMock.getOrCreateCustomerEmpresa).not.toHaveBeenCalled();
    expect(cobrancaMock.encerrarCobrancasAnteriores).not.toHaveBeenCalled();
    expect(fechDbMock.reivindicarEnvio).not.toHaveBeenCalled();
  });

  it("falha ao gerar o Pix → volta a conferido, nenhum e-mail", async () => {
    cobrancaMock.garantirCobrancaPix.mockRejectedValue(new Error("[invalid_customer] Cliente inválido"));
    await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow(/Pix.*Cliente inválido.*conferido/);
    expect(fechDbMock.desfazerReivindicacao).toHaveBeenCalledWith({ fechamentoId: 11, versao: 2 });
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("falha ao encerrar a cobrança anterior (pagaram no meio) → nada reivindicado, nada enviado", async () => {
    cobrancaMock.encerrarCobrancasAnteriores.mockRejectedValue(new Error("[invalid_action] recebida"));
    await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow(/cobrança anterior/);
    expect(fechDbMock.reivindicarEnvio).not.toHaveBeenCalled();
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });
});

describe("enviarFechamento", () => {
  it("manda PDF + XLSX ao RH com cópia, registra no histórico e só então marca enviado", async () => {
    const r = await enviarFechamento({ fechamentoId: 11, versao: 2, usuario: "andre" });

    expect(r).toEqual({ versao: 2, para: "rh@amazonfive.com.br" });
    const email = emailMock.sendEmail.mock.calls[0][0];
    expect(email.to).toBe("rh@amazonfive.com.br");
    expect(email.cc).toEqual(["financeiro@amazonfive.com.br"]);
    expect(email.subject).toBe("Demonstrativo BFX — outubro de 2026 — Amazon Five <Ltda>");
    expect(email.registro).toEqual({ tipo: "fechamento", empresaId: 7, origem: "manual" });
    expect(email.attachments.map((a: { filename: string; contentType: string }) => [a.filename, a.contentType])).toEqual([
      ["demonstrativo-amazon-five-ltda-2026-10-v2.pdf", "application/pdf"],
      ["demonstrativo-amazon-five-ltda-2026-10-v2.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["pix-2026-10.png", "image/png"],
    ]);
    const pdf = email.attachments[0].content as Buffer;
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(Buffer.from(email.attachments[1].content).equals(XLSX)).toBe(true);

    // o PDF enviado fica guardado na versão
    const arq = dbMock.arquivoFinanceiro.create.mock.calls[0][0].data;
    expect(arq).toMatchObject({ contentType: "application/pdf", nome: "demonstrativo-amazon-five-ltda-2026-10-v2.pdf", criadoPor: "andre" });
    expect(fechDbMock.reivindicarEnvio).toHaveBeenCalledWith({ fechamentoId: 11, versao: 2 });
    expect(fechDbMock.reivindicarEnvio.mock.invocationCallOrder[0]).toBeLessThan(emailMock.sendEmail.mock.invocationCallOrder[0]);
    expect(fechDbMock.marcarEnviado).toHaveBeenCalledWith({ fechamentoId: 11, versao: 2, pdfArquivoId: 55, usuario: "andre" });
    expect(fechDbMock.marcarEnviado.mock.invocationCallOrder[0]).toBeGreaterThan(emailMock.sendEmail.mock.invocationCallOrder[0]);
  });

  it("o corpo traz valor final, vencimento do Pix e os anexos, com o nome da empresa escapado", async () => {
    await enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null });
    const html: string = emailMock.sendEmail.mock.calls[0][0].html;
    expect(html).toContain("outubro de 2026");
    expect(html).toMatch(/R\$\s?450,00/);
    expect(html).toContain("Vencimento do Pix: 15/10/2026");
    expect(html).toContain("Amazon Five &lt;Ltda&gt;");
    expect(html).not.toContain("<Ltda>");
    expect(html).toContain("demonstrativo-amazon-five-ltda-2026-10-v2.pdf");
    expect(html).toContain("demonstrativo-amazon-five-ltda-2026-10-v2.xlsx");
  });

  it("htmlEmailFechamento é puro e escapa tudo que vem do cadastro", () => {
    const html = htmlEmailFechamento({
      empresa: "<script>x</script>",
      competencia: "2026-10",
      versao: 1,
      totalFinal: 1234.5,
      vencimentoPix: new Date("2026-10-15T00:00:00Z"),
      anexos: ["a<b>.pdf"],
      pix: { copiaECola: "abc<i>", valor: 1234.5, identificacao: "FEC-1-2026-10-v1" },
      recebido: 0,
    });
    expect(html).toContain("abc&lt;i&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("a&lt;b&gt;.pdf");
    expect(html).toMatch(/R\$\s?1\.234,50/);
  });

  it("empresa sem e-mail do RH → erro claro antes de gerar ou enviar", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(
      fechamento({ empresaParceira: { id: 7, nome: "Amazon Five", cnpj: null, emailRh: "  ", emailCopia: null } })
    );
    await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow(/e-mail do RH/);
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
    expect(dbMock.arquivoFinanceiro.create).not.toHaveBeenCalled();
    expect(fechDbMock.marcarEnviado).not.toHaveBeenCalled();
  });

  it("fora de conferido → erro, nada enviado", async () => {
    for (const status of ["em_preparacao", "enviado"]) {
      dbMock.fechamento.findUnique.mockResolvedValue(fechamento({ status }));
      await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow(/conferido/);
    }
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("falha no SMTP → erro, nada gravado, a reivindicação é desfeita (volta a conferido)", async () => {
    emailMock.sendEmail.mockRejectedValue(new Error("connect ECONNREFUSED smtp.interno:587"));
    // A causa vai para o histórico de e-mails; a mensagem da tela não leva host.
    const erro = await enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null }).catch((x: Error) => x.message);
    expect(erro).toBe("O e-mail não saiu. O motivo ficou no histórico de e-mails; o fechamento continua conferido.");
    expect(fechDbMock.desfazerReivindicacao).toHaveBeenCalledWith({ fechamentoId: 11, versao: 2 });
    expect(dbMock.arquivoFinanceiro.create).not.toHaveBeenCalled();
    expect(fechDbMock.marcarEnviado).not.toHaveBeenCalled();
  });

  it("versão diferente da que a tela mostrou → recusa sem enviar", async () => {
    await expect(enviarFechamento({ fechamentoId: 11, versao: 1, usuario: null })).rejects.toThrow(/versão 2/);
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
    expect(fechDbMock.reivindicarEnvio).not.toHaveBeenCalled();
  });

  it("outra aba/pod já reivindicou → recusa sem enviar", async () => {
    fechDbMock.reivindicarEnvio.mockRejectedValue(new Error("Outra operação mudou este fechamento. Recarregue."));
    await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow(/Recarregue/);
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });

  it("clique duplo: o segundo envio em andamento é recusado sem mandar outro e-mail", async () => {
    let soltar: () => void = () => {};
    emailMock.sendEmail.mockImplementationOnce(() => new Promise<void>((ok) => { soltar = ok; }));
    const primeiro = enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null });
    await expect(enviarFechamento({ fechamentoId: 11, versao: 2, usuario: null })).rejects.toThrow(/em andamento/);
    await vi.waitFor(() => expect(emailMock.sendEmail).toHaveBeenCalledTimes(1));
    soltar();
    await primeiro;
    expect(emailMock.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("fechamento inexistente → erro", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(null);
    await expect(enviarFechamento({ fechamentoId: 99, versao: 1, usuario: null })).rejects.toThrow(/não encontrado/);
  });
});
