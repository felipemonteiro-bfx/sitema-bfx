// Envio do demonstrativo ao RH (Fase 5): exige fechamento conferido e e-mail do RH, gera o PDF da
// versão atual (sem Pix nesta fase), manda PDF + XLSX, registra no histórico (tipo "fechamento") e
// só depois marca enviado. Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §5.2.
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
vi.mock("@/lib/fechamento-db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/fechamento-db")>();
  return { ...real, ...fechDbMock };
});

const { enviarFechamento, htmlEmailFechamento } = await import("@/lib/fechamento-envio");
const { ROTULO_TIPO_EMAIL } = await import("@/lib/email-tipos");

const XLSX = Buffer.from("PK\u0003\u0004fake");

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
  dbMock.config.findFirst.mockResolvedValue({ logoPath: null });
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
    });
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
