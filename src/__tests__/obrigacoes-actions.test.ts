// Actions da agenda de obrigacoes (Fase 4, spec §3.4, §3.5 e §6): anexar o documento do boleto
// Prudent, registrar e estornar pagamento, substituir boleto e mudar o direcionamento.
// Prisma mockado; a transacao roda com o proprio mock.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { linhaBancariaDeCodigoBarras, modulo11Bancario } from "@/lib/linha-digitavel";

const dbMock = {
  boletoPrudent: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  boletoPagamento: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  parcelaVencimento: { updateMany: vi.fn(), findFirst: vi.fn() },
  arquivoFinanceiro: { create: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
};
const guardsMock = { requireAdminOrThrow: vi.fn() };
const auditMock = { createAuditLog: vi.fn() };
const cacheMock = { revalidatePath: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("next/cache", () => cacheMock);

const {
  anexarDocumentoBoleto,
  registrarPagamentoBoleto,
  estornarPagamentoBoleto,
  substituirBoleto,
  alterarDirecionamento,
} = await import("@/app/(app)/obrigacoes/actions");

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const DIA_MS = 86_400_000;
const ATUALIZADO = new Date("2026-10-01T12:00:00.000Z");

/** Linha bancaria valida com o valor e o vencimento pedidos (fator na base de 22/02/2025). */
function linhaCom(valorCentavos: number, venc: string) {
  const fator = String(1000 + Math.round((dia(venc).getTime() - dia("2025-02-22").getTime()) / DIA_MS));
  const valor = String(valorCentavos).padStart(10, "0");
  const semDv = "0019" + fator + valor + "1234567890123456789012345";
  const codigo = semDv.slice(0, 4) + String(modulo11Bancario(semDv)) + semDv.slice(4);
  return linhaBancariaDeCodigoBarras(codigo);
}
const LINHA_OK = linhaCom(30000, "2026-10-10");

const PDF = new TextEncoder().encode("%PDF-1.7\n");
const arquivo = (bytes: Uint8Array, nome = "boleto.pdf") => new File([bytes as BlobPart], nome, { type: "application/pdf" });

function form(campos: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

const boleto = (extra: Record<string, unknown> = {}) => ({
  id: 10,
  loteId: 3,
  empresaParceiraId: 7,
  vencimento: dia("2026-10-10"),
  valorEsperado: 300,
  valorDocumento: null,
  linhaDigitavel: null,
  direcionamento: "bfx",
  status: "aguardando_documento",
  atualizadoEm: ATUALIZADO,
  pagamentos: [],
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "andre", role: "admin", nomeExibicao: "André" });
  dbMock.boletoPrudent.findUnique.mockResolvedValue(boleto());
  dbMock.boletoPrudent.findFirst.mockResolvedValue(null);
  dbMock.boletoPrudent.updateMany.mockResolvedValue({ count: 1 });
  dbMock.boletoPrudent.create.mockResolvedValue({ id: 11 });
  dbMock.boletoPagamento.findUnique.mockResolvedValue(null);
  dbMock.boletoPagamento.create.mockResolvedValue({ id: 50 });
  dbMock.boletoPagamento.updateMany.mockResolvedValue({ count: 1 });
  dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 2 });
  dbMock.parcelaVencimento.findFirst.mockResolvedValue(null);
  dbMock.arquivoFinanceiro.create.mockResolvedValue({ id: 77, sha256: "x" });
});

describe("guarda de admin antes de tudo", () => {
  it.each([
    ["anexarDocumentoBoleto", () => anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: LINHA_OK }))],
    ["registrarPagamentoBoleto", () => registrarPagamentoBoleto(form({ boletoId: "10" }))],
    ["estornarPagamentoBoleto", () => estornarPagamentoBoleto(50)],
    ["substituirBoleto", () => substituirBoleto(form({ boletoId: "10" }))],
    ["alterarDirecionamento", () => alterarDirecionamento(10, "bfx")],
  ])("%s", async (_nome, chamar) => {
    guardsMock.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado."));
    await expect(chamar()).rejects.toThrow("Acesso negado.");
    expect(dbMock.boletoPrudent.findUnique).not.toHaveBeenCalled();
    expect(dbMock.boletoPrudent.updateMany).not.toHaveBeenCalled();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("anexarDocumentoBoleto", () => {
  it("linha que bate com o esperado: grava valor, vencimento, so os digitos e passa a a pagar", async () => {
    const formatada = `${LINHA_OK.slice(0, 5)}.${LINHA_OK.slice(5, 10)} ${LINHA_OK.slice(10)}`;
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: formatada }));
    expect(r).toEqual({ ok: true });
    expect(dbMock.boletoPrudent.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: "aguardando_documento" },
      data: {
        valorDocumento: 300,
        vencimentoDocumento: dia("2026-10-10"),
        linhaDigitavel: LINHA_OK,
        divergenciaJustificativa: null,
        status: "a_pagar",
      },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("obrigacoes:anexar", expect.objectContaining({ boletoId: 10 }));
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith("/obrigacoes");
  });

  it("com PDF: grava o arquivo e liga ao boleto", async () => {
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: LINHA_OK, pdf: arquivo(PDF) }));
    expect(r).toEqual({ ok: true });
    expect(dbMock.arquivoFinanceiro.create).toHaveBeenCalledTimes(1);
    expect(dbMock.boletoPrudent.updateMany.mock.calls[0][0].data).toMatchObject({ pdfArquivoId: 77 });
  });

  it("arquivo que nao e PDF e recusado sem gravar nada", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: LINHA_OK, pdf: arquivo(png, "b.pdf") }));
    expect(r).toEqual({ ok: false, erro: "Envie um PDF." });
    expect(dbMock.arquivoFinanceiro.create).not.toHaveBeenCalled();
    expect(dbMock.boletoPrudent.updateMany).not.toHaveBeenCalled();
  });

  it("linha com um digito trocado e recusada pelo DV, pedindo valor e vencimento a mao", async () => {
    const errada = LINHA_OK.slice(0, 12) + String((Number(LINHA_OK[12]) + 1) % 10) + LINHA_OK.slice(13);
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: errada }));
    expect(r).toEqual({
      ok: false,
      erro: "Dígito verificador do campo 2 não confere. Confira a linha ou informe valor e vencimento à mão.",
    });
    expect(dbMock.boletoPrudent.updateMany).not.toHaveBeenCalled();
  });

  it("linha que nao decodifica, com valor e vencimento a mao: aceita e nao grava a linha errada", async () => {
    const errada = LINHA_OK.slice(0, 12) + String((Number(LINHA_OK[12]) + 1) % 10) + LINHA_OK.slice(13);
    const r = await anexarDocumentoBoleto(
      form({ boletoId: "10", linhaDigitavel: errada, valorManual: "300", vencimentoManual: "2026-10-10", pdf: arquivo(PDF) })
    );
    expect(r).toEqual({ ok: true });
    expect(dbMock.boletoPrudent.updateMany.mock.calls[0][0].data).toMatchObject({
      valorDocumento: 300,
      vencimentoDocumento: dia("2026-10-10"),
      linhaDigitavel: null,
    });
  });

  it("valor diferente do esperado sem justificativa e recusado; com justificativa, grava", async () => {
    const outra = linhaCom(31050, "2026-10-10");
    const sem = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: outra }));
    expect(sem).toEqual({
      ok: false,
      erro: "O documento difere do esperado (valor). Escreva a justificativa (5 caracteres ou mais).",
    });
    expect(dbMock.boletoPrudent.updateMany).not.toHaveBeenCalled();

    const com = await anexarDocumentoBoleto(
      form({ boletoId: "10", linhaDigitavel: outra, justificativa: "  Juros cobrados pela Prudent  " })
    );
    expect(com).toEqual({ ok: true });
    expect(dbMock.boletoPrudent.updateMany.mock.calls[0][0].data).toMatchObject({
      valorDocumento: 310.5,
      divergenciaJustificativa: "Juros cobrados pela Prudent",
    });
  });

  it("vencimento diferente tambem exige justificativa", async () => {
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: linhaCom(30000, "2026-10-13") }));
    expect(r).toMatchObject({ ok: false, erro: expect.stringContaining("(vencimento)") });
  });

  it("sem linha e sem valor a mao e recusado", async () => {
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", pdf: arquivo(PDF) }));
    expect(r).toEqual({ ok: false, erro: "Informe a linha digitável ou o valor e o vencimento do boleto." });
  });

  it("boleto que ja tem documento e recusado", async () => {
    dbMock.boletoPrudent.findUnique.mockResolvedValue(boleto({ status: "a_pagar" }));
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: LINHA_OK }));
    expect(r).toEqual({ ok: false, erro: "Este boleto já tem documento. Para trocar, substitua o boleto." });
  });

  it("linha ja usada em outro boleto e recusada", async () => {
    dbMock.boletoPrudent.findFirst.mockResolvedValue({ id: 99 });
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: LINHA_OK }));
    expect(r).toEqual({ ok: false, erro: "Esta linha digitável já está no boleto #99." });
  });

  it("dois anexos ao mesmo tempo: o segundo encontra o status mudado", async () => {
    dbMock.boletoPrudent.updateMany.mockResolvedValue({ count: 0 });
    const r = await anexarDocumentoBoleto(form({ boletoId: "10", linhaDigitavel: LINHA_OK }));
    expect(r).toEqual({ ok: false, erro: "O boleto mudou enquanto você anexava. Recarregue." });
    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });
});

describe("registrarPagamentoBoleto", () => {
  const pagar = (extra: Record<string, string | File> = {}) =>
    registrarPagamentoBoleto(
      form({ boletoId: "10", dataPagamento: "2026-09-30", valorPrincipal: "300", valorEncargos: "0", ...extra })
    );

  beforeEach(() => {
    dbMock.boletoPrudent.findUnique.mockResolvedValue(boleto({ status: "a_pagar", valorDocumento: 300 }));
  });

  it("cria o pagamento e atualiza o status com o status e a versao lidos no where", async () => {
    const r = await pagar({ autenticacao: "AB12" });
    expect(r).toEqual({ ok: true });
    expect(dbMock.boletoPagamento.create.mock.calls[0][0].data).toMatchObject({
      boletoId: 10,
      dataPagamento: dia("2026-09-30"),
      valorPrincipal: 300,
      valorEncargos: 0,
      autenticacao: "AB12",
      registradoPor: "André",
    });
    expect(dbMock.boletoPrudent.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: "a_pagar", atualizadoEm: ATUALIZADO },
      data: { status: "pago", atualizadoEm: expect.any(Date) },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith("obrigacoes:pagamento", expect.objectContaining({ boletoId: 10 }));
  });

  it("dois cliques: o segundo encontra o boleto mudado e nada fica gravado", async () => {
    dbMock.boletoPrudent.updateMany.mockResolvedValue({ count: 0 });
    const r = await pagar();
    expect(r).toEqual({ ok: false, erro: "O boleto mudou enquanto você registrava. Recarregue." });
    expect(auditMock.createAuditLog).not.toHaveBeenCalled();
  });

  it("comprovante ja usado e recusado antes de criar o pagamento", async () => {
    dbMock.boletoPagamento.findUnique.mockResolvedValue({ id: 49 });
    const r = await pagar({ comprovante: arquivo(PDF, "comp.pdf") });
    expect(r).toEqual({ ok: false, erro: "Este comprovante já foi usado." });
    expect(dbMock.boletoPagamento.create).not.toHaveBeenCalled();
  });

  it("comprovante repetido que escapa da leitura cai na unique e vira a mesma mensagem", async () => {
    dbMock.boletoPagamento.create.mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));
    const r = await pagar({ comprovante: arquivo(PDF, "comp.pdf") });
    expect(r).toEqual({ ok: false, erro: "Este comprovante já foi usado." });
  });

  it("com comprovante: grava o arquivo e o hash", async () => {
    const r = await pagar({ comprovante: arquivo(PDF, "comp.pdf") });
    expect(r).toEqual({ ok: true });
    expect(dbMock.boletoPagamento.create.mock.calls[0][0].data).toMatchObject({
      comprovanteArquivoId: 77,
      comprovanteHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("pagamento que passa do valor do boleto e recusado", async () => {
    dbMock.boletoPrudent.findUnique.mockResolvedValue(
      boleto({ status: "pago_parcial", valorDocumento: 300, pagamentos: [{ valorPrincipal: 200, estornadoEm: null }] })
    );
    const r = await pagar({ valorPrincipal: "150" });
    expect(r).toEqual({ ok: false, erro: "O pagamento passa do valor do boleto em R$ 50,00." });
    expect(dbMock.boletoPagamento.create).not.toHaveBeenCalled();
  });

  it("parcial vira pago_parcial", async () => {
    await pagar({ valorPrincipal: "100" });
    expect(dbMock.boletoPrudent.updateMany.mock.calls[0][0].data.status).toBe("pago_parcial");
  });

  it("boleto que a empresa paga nao recebe pagamento da BFX", async () => {
    dbMock.boletoPrudent.findUnique.mockResolvedValue(boleto({ status: "a_pagar", direcionamento: "empresa" }));
    const r = await pagar();
    expect(r).toEqual({ ok: false, erro: "Este boleto é pago pela empresa; a BFX não registra pagamento nele." });
  });

  it("data futura, data ilegivel, encargo negativo e boleto inexistente sao recusados", async () => {
    expect((await pagar({ dataPagamento: "2999-01-01" })).ok).toBe(false);
    expect((await pagar({ dataPagamento: "30/09/2026" })).ok).toBe(false);
    expect((await pagar({ valorEncargos: "-1" })).ok).toBe(false);
    dbMock.boletoPrudent.findUnique.mockResolvedValue(null);
    expect(await pagar()).toEqual({ ok: false, erro: "Boleto não encontrado." });
    expect(dbMock.boletoPagamento.create).not.toHaveBeenCalled();
  });
});

describe("estornarPagamentoBoleto", () => {
  beforeEach(() => {
    dbMock.boletoPagamento.findUnique.mockResolvedValue({
      id: 50,
      boletoId: 10,
      estornadoEm: null,
      valorPrincipal: 300,
      boleto: boleto({
        status: "pago",
        valorDocumento: 300,
        pagamentos: [{ id: 50, valorPrincipal: 300, estornadoEm: null }],
      }),
    });
  });

  it("marca o estorno e recalcula o status do boleto", async () => {
    const r = await estornarPagamentoBoleto(50);
    expect(r).toEqual({ ok: true });
    expect(dbMock.boletoPagamento.updateMany).toHaveBeenCalledWith({
      where: { id: 50, estornadoEm: null },
      // o hash sai do pagamento estornado: o mesmo comprovante pode ir no registro corrigido
      // (o arquivo continua ligado por comprovanteArquivoId e guarda o proprio sha256)
      data: { estornadoEm: expect.any(Date), estornadoPor: "André", comprovanteHash: null },
    });
    expect(dbMock.boletoPrudent.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: "pago", atualizadoEm: ATUALIZADO },
      data: { status: "a_pagar", atualizadoEm: expect.any(Date) },
    });
  });

  it("pagamento ja estornado e recusado", async () => {
    dbMock.boletoPagamento.updateMany.mockResolvedValue({ count: 0 });
    const r = await estornarPagamentoBoleto(50);
    expect(r).toEqual({ ok: false, erro: "Este pagamento já foi estornado." });
  });

  it("id invalido e recusado", async () => {
    expect(await estornarPagamentoBoleto(0)).toEqual({ ok: false, erro: "Pagamento não encontrado." });
  });
});

describe("substituirBoleto", () => {
  beforeEach(() => {
    dbMock.boletoPrudent.findUnique.mockResolvedValue(
      boleto({ status: "a_pagar", valorDocumento: 300, linhaDigitavel: linhaCom(30000, "2026-10-10") })
    );
  });

  const novaLinha = linhaCom(30000, "2026-10-10");

  it("original vira substituido antes do novo nascer; o novo herda lote, vencimento e valor e leva as parcelas", async () => {
    const outra = (() => {
      // mesma data e valor, campo livre diferente (boleto reemitido)
      const fator = String(1000 + Math.round((dia("2026-10-10").getTime() - dia("2025-02-22").getTime()) / DIA_MS));
      const semDv = "0019" + fator + "0000030000" + "9999999999999999999999999";
      return linhaBancariaDeCodigoBarras(semDv.slice(0, 4) + String(modulo11Bancario(semDv)) + semDv.slice(4));
    })();
    const r = await substituirBoleto(form({ boletoId: "10", linhaDigitavel: outra, pdf: arquivo(PDF) }));
    expect(r).toEqual({ ok: true });

    expect(dbMock.boletoPrudent.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: "a_pagar", atualizadoEm: ATUALIZADO },
      data: { status: "substituido", atualizadoEm: expect.any(Date) },
    });
    expect(dbMock.boletoPrudent.create.mock.calls[0][0].data).toMatchObject({
      loteId: 3,
      empresaParceiraId: 7,
      vencimento: dia("2026-10-10"),
      valorEsperado: 300,
      direcionamento: "bfx",
      substituiId: 10,
      status: "a_pagar",
      valorDocumento: 300,
      linhaDigitavel: outra,
      pdfArquivoId: 77,
    });
    // o indice parcial so admite um vivo: o original sai antes
    expect(dbMock.boletoPrudent.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      dbMock.boletoPrudent.create.mock.invocationCallOrder[0]
    );
    expect(dbMock.parcelaVencimento.updateMany).toHaveBeenCalledWith({
      where: { boletoPrudentId: 10 },
      data: { boletoPrudentId: 11 },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(
      "obrigacoes:substituir",
      expect.objectContaining({ boletoId: 10, novoBoletoId: 11 })
    );
  });

  it("boleto com pagamento vivo nao e substituido", async () => {
    dbMock.boletoPrudent.findUnique.mockResolvedValue(
      boleto({ status: "pago_parcial", pagamentos: [{ valorPrincipal: 100, estornadoEm: null }] })
    );
    const r = await substituirBoleto(form({ boletoId: "10", linhaDigitavel: novaLinha }));
    expect(r).toEqual({ ok: false, erro: "Boleto com pagamento registrado não pode ser substituído. Estorne o pagamento antes." });
    expect(dbMock.boletoPrudent.create).not.toHaveBeenCalled();
  });

  it("boleto ja substituido ou cancelado nao e substituido de novo", async () => {
    dbMock.boletoPrudent.findUnique.mockResolvedValue(boleto({ status: "substituido" }));
    const r = await substituirBoleto(form({ boletoId: "10", linhaDigitavel: novaLinha }));
    expect(r).toEqual({ ok: false, erro: "Este boleto já foi substituído ou cancelado." });
  });

  it("o documento novo passa pelas mesmas conferencias do anexo", async () => {
    const r = await substituirBoleto(form({ boletoId: "10" }));
    expect(r).toEqual({ ok: false, erro: "Informe a linha digitável ou o valor e o vencimento do boleto." });
    expect(dbMock.boletoPrudent.updateMany).not.toHaveBeenCalled();
  });

  it("corrida: o original mudou → nada e criado", async () => {
    dbMock.boletoPrudent.updateMany.mockResolvedValue({ count: 0 });
    const r = await substituirBoleto(
      form({ boletoId: "10", valorManual: "300", vencimentoManual: "2026-10-10", pdf: arquivo(PDF) })
    );
    expect(r).toEqual({ ok: false, erro: "O boleto mudou enquanto você substituía. Recarregue." });
    expect(dbMock.boletoPrudent.create).not.toHaveBeenCalled();
  });
});

describe("alterarDirecionamento", () => {
  it("muda so boleto vivo com outro direcionamento, e audita", async () => {
    const r = await alterarDirecionamento(10, "bfx");
    expect(r).toEqual({ ok: true });
    expect(dbMock.boletoPrudent.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: { notIn: ["substituido", "cancelado"] }, direcionamento: { not: "bfx" } },
      data: { direcionamento: "bfx" },
    });
    expect(auditMock.createAuditLog).toHaveBeenCalledWith(
      "obrigacoes:direcionamento",
      expect.objectContaining({ boletoId: 10, destino: "bfx" })
    );
  });

  // Fase 5 (spec §3.4): bfx → empresa só se nenhuma parcela do boleto estiver em fechamento
  // conferido ou posterior — senão a empresa pagaria a parcela à Prudent e no Pix.
  it("bfx → empresa com parcela em fechamento conferido: recusa sem gravar", async () => {
    dbMock.parcelaVencimento.findFirst.mockResolvedValue({
      vendaId: 240,
      numeroParcela: 3,
      fechamento: { status: "conferido", competencia: "2026-10" },
    });
    const r = await alterarDirecionamento(10, "empresa");
    expect(r).toEqual({
      ok: false,
      erro: "Parcela deste boleto está no fechamento de outubro de 2026 (Conferido). Reabra o fechamento antes de devolver o boleto à empresa.",
    });
    expect(dbMock.parcelaVencimento.findFirst.mock.calls[0][0].where).toEqual({
      boletoPrudentId: 10,
      fechamento: { status: { not: "em_preparacao" } },
    });
    expect(dbMock.boletoPrudent.updateMany).not.toHaveBeenCalled();
  });

  it("bfx → empresa: a trava também vai no where (fechamento conferido no meio)", async () => {
    expect(await alterarDirecionamento(10, "empresa")).toEqual({ ok: true });
    expect(dbMock.boletoPrudent.updateMany).toHaveBeenCalledWith({
      where: {
        id: 10,
        status: { notIn: ["substituido", "cancelado"] },
        direcionamento: { not: "empresa" },
        parcelas: { none: { fechamento: { status: { not: "em_preparacao" } } } },
      },
      data: { direcionamento: "empresa" },
    });
  });

  it("destino invalido e recusado; nada mudou → erro", async () => {
    expect(await alterarDirecionamento(10, "outro" as never)).toEqual({ ok: false, erro: "Direcionamento inválido." });
    dbMock.boletoPrudent.updateMany.mockResolvedValue({ count: 0 });
    expect(await alterarDirecionamento(10, "empresa")).toEqual({
      ok: false,
      erro: "Boleto não encontrado, já com esse direcionamento ou fora de uso.",
    });
  });
});
