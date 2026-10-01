// Gravações do fechamento mensal (Fase 5): gerar/atualizar com reserva, ajustes, conferir (versão
// congelada + XLSX), reabrir e marcar enviado. Prisma mockado, padrão de lote-antecipacao.test.ts.
// Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.6 e §5.
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  fechamento: { upsert: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  parcelaVencimento: { findMany: vi.fn(), updateMany: vi.fn() },
  fechamentoAjuste: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  fechamentoVersao: { create: vi.fn(), updateMany: vi.fn() },
  arquivoFinanceiro: { create: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
const regraMock = { regrasDaEmpresa: vi.fn() };
vi.mock("@/lib/regra-empresa-db", () => regraMock);

const {
  gerarOuAtualizarFechamento,
  adicionarAjuste,
  removerAjuste,
  conferirFechamento,
  reabrirFechamento,
  marcarEnviado,
} = await import("@/lib/fechamento-db");

const REGRA_BFX = {
  vigenteDe: new Date("2026-01-01T00:00:00Z"),
  vigenteAte: null,
  diaCorte: 20,
  diaVencimento: 10,
  diaPix: 15,
  repassePct: null,
  repasseBase: null,
  cobrancaViaBfx: true,
};

type ParcelaRow = ReturnType<typeof parcela>;
function parcela(id: number, extra: Record<string, unknown> = {}) {
  const { venda: vendaExtra, ...resto } = extra as { venda?: Record<string, unknown> };
  return {
    id,
    vendaId: 240,
    numeroParcela: 1,
    dataVencimento: new Date("2026-10-10T00:00:00Z"),
    valorParcela: 300,
    paga: false,
    antecipada: false,
    liquidadaEm: null as Date | null,
    fechamentoId: null as number | null,
    confirmacaoRh: "confirmada" as string | null,
    antecipacaoLoteId: null as number | null,
    boletoPrudentId: null as number | null,
    antecipacaoLote: null as { status: string } | null,
    boletoPrudent: null as { direcionamento: string } | null,
    venda: {
      id: 240,
      status: "ativa",
      cliente: { nome: "ANA SOUZA", matricula: "0042", empresaParceiraId: 7 },
      _count: { parcelasVencimento: 4 },
      ...vendaExtra,
    },
    ...resto,
  };
}

const fechamentoEmPreparacao = (extra: Record<string, unknown> = {}) => ({
  id: 11,
  empresaParceiraId: 7,
  competencia: "2026-10",
  status: "em_preparacao",
  versaoAtual: 0,
  desatualizado: false,
  responsavel: "andre",
  empresaParceira: { id: 7, nome: "AMAZON FIVE", cnpj: "12.345.678/0001-90" },
  ajustes: [] as { id: number; valor: number; justificativa: string; removidoEm: Date | null }[],
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  regraMock.regrasDaEmpresa.mockResolvedValue([REGRA_BFX]);
  dbMock.fechamento.upsert.mockResolvedValue(fechamentoEmPreparacao());
  dbMock.fechamento.findUnique.mockResolvedValue(fechamentoEmPreparacao());
  dbMock.fechamento.updateMany.mockResolvedValue({ count: 1 });
  dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
  dbMock.parcelaVencimento.updateMany.mockImplementation(async (args: { where?: { id?: { in?: number[] } } }) => ({
    count: args?.where?.id?.in?.length ?? 0,
  }));
  dbMock.fechamentoAjuste.updateMany.mockResolvedValue({ count: 1 });
  dbMock.fechamentoVersao.create.mockResolvedValue({ id: 900 });
  dbMock.fechamentoVersao.updateMany.mockResolvedValue({ count: 1 });
  dbMock.arquivoFinanceiro.create.mockResolvedValue({ id: 77 });
});

describe("gerarOuAtualizarFechamento", () => {
  it("empresa sem cobrança via BFX no dia 1º da competência → erro, nada gravado", async () => {
    regraMock.regrasDaEmpresa.mockResolvedValue([{ ...REGRA_BFX, cobrancaViaBfx: false }]);
    await expect(
      gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: "andre" })
    ).rejects.toThrow(/cobrança via BFX/);
    expect(dbMock.fechamento.upsert).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("regra que liga a cobrança só no meio do mês não vale para a competência", async () => {
    regraMock.regrasDaEmpresa.mockResolvedValue([{ ...REGRA_BFX, vigenteDe: new Date("2026-10-15T00:00:00Z") }]);
    await expect(
      gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: null })
    ).rejects.toThrow(/cobrança via BFX/);
  });

  it("competência inválida → erro", async () => {
    await expect(
      gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-13", usuario: null })
    ).rejects.toThrow(/Competência inválida/);
  });

  it("cria pelo unique (empresa, competência), reserva as elegíveis com fechamentoId: null no where e lista as bloqueadas", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      parcela(1),
      parcela(2, { confirmacaoRh: "recusada" }),
      parcela(3, { antecipada: true, paga: true, antecipacaoLoteId: 5, antecipacaoLote: { status: "concluido" }, boletoPrudentId: 9, boletoPrudent: { direcionamento: "bfx" } }),
      parcela(4, { antecipada: true, paga: true, antecipacaoLoteId: 5, antecipacaoLote: { status: "concluido" }, boletoPrudentId: 8, boletoPrudent: { direcionamento: "empresa" } }),
    ]);

    const r = await gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: "andre" });

    expect(dbMock.fechamento.upsert.mock.calls[0][0]).toMatchObject({
      where: { empresaParceiraId_competencia: { empresaParceiraId: 7, competencia: "2026-10" } },
      create: { empresaParceiraId: 7, competencia: "2026-10", responsavel: "andre" },
    });
    const reserva = dbMock.parcelaVencimento.updateMany.mock.calls.map((c) => c[0]).find((a) => a.data.fechamentoId === 11);
    expect(reserva.where).toMatchObject({ id: { in: [1, 3] }, fechamentoId: null, liquidadaEm: null });
    expect(r).toEqual({
      fechamentoId: 11,
      reservadas: 2,
      liberadas: 0,
      bloqueadas: [
        { parcelaId: 2, motivo: "recusada_rh" },
        { parcelaId: 4, motivo: "boleto_a_empresa" },
      ],
    });
    // A busca cobre as parcelas da empresa no mês e as já reservadas neste fechamento.
    const where = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain("\"fechamentoId\":11");
    expect(where.OR[0]).toMatchObject({
      dataVencimento: { gte: new Date("2026-10-01T00:00:00Z"), lt: new Date("2026-11-01T00:00:00Z") },
      venda: { cliente: { empresaParceiraId: 7 } },
    });
    // desatualizado volta a false com o status no where
    expect(dbMock.fechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 11, status: "em_preparacao" },
      data: { desatualizado: false },
    });
  });

  it("reserva de não antecipada exige paga: false no where (baixa concorrente)", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1)]);
    await gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: null });
    const reserva = dbMock.parcelaVencimento.updateMany.mock.calls.map((c) => c[0]).find((a) => a.data.fechamentoId === 11);
    expect(reserva.where.OR).toEqual([{ antecipada: true }, { paga: false }]);
  });

  it("corrida: outra operação pegou parcela (count menor) → erro e a transação desfaz", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1), parcela(2)]);
    dbMock.parcelaVencimento.updateMany.mockResolvedValue({ count: 1 });
    await expect(
      gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: null })
    ).rejects.toThrow("Outra operação pegou parcelas deste fechamento. Recarregue.");
  });

  it("libera a reservada que ficou inelegível, a que saiu do mês e a de outra empresa", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      parcela(1, { fechamentoId: 11 }),
      parcela(2, { fechamentoId: 11, venda: { status: "cancelada" } }),
      parcela(3, { fechamentoId: 11, dataVencimento: new Date("2026-11-10T00:00:00Z") }),
      parcela(4, { fechamentoId: 11, venda: { cliente: { nome: "X", matricula: null, empresaParceiraId: 8 } } }),
    ]);

    const r = await gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: null });

    const chamadas = dbMock.parcelaVencimento.updateMany.mock.calls.map((c) => c[0]);
    const liberacao = chamadas.find((a) => a.data.fechamentoId === null);
    expect(liberacao).toEqual({ where: { id: { in: [2, 3, 4] }, fechamentoId: 11 }, data: { fechamentoId: null } });
    // a que já estava reservada aqui não é reservada de novo
    expect(chamadas.find((a) => a.data.fechamentoId === 11)).toBeUndefined();
    expect(r.reservadas).toBe(1);
    expect(r.liberadas).toBe(3);
    // só a da competência e da empresa aparece como bloqueada
    expect(r.bloqueadas).toEqual([{ parcelaId: 2, motivo: "venda_inativa" }]);
  });

  it("parcela de outro fechamento aparece bloqueada e não é tocada", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1, { fechamentoId: 99 })]);
    const r = await gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: null });
    expect(r.bloqueadas).toEqual([{ parcelaId: 1, motivo: "em_outro_fechamento" }]);
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("fechamento já conferido → erro, nada reservado", async () => {
    dbMock.fechamento.upsert.mockResolvedValue(fechamentoEmPreparacao({ status: "conferido" }));
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1)]);
    await expect(
      gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: null })
    ).rejects.toThrow(/Reabra/);
    expect(dbMock.parcelaVencimento.updateMany).not.toHaveBeenCalled();
  });

  it("status mudou entre a leitura e a gravação (count 0) → erro", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([parcela(1)]);
    dbMock.fechamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      gerarOuAtualizarFechamento({ empresaParceiraId: 7, competencia: "2026-10", usuario: null })
    ).rejects.toThrow(/Recarregue/);
  });
});

describe("ajustes", () => {
  it("adiciona com justificativa, travando o status em preparação", async () => {
    await adicionarAjuste({ fechamentoId: 11, valor: -50, justificativa: "Desconto combinado", usuario: "andre" });
    expect(dbMock.fechamento.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 11, status: "em_preparacao" } });
    expect(dbMock.fechamentoAjuste.create).toHaveBeenCalledWith({
      data: { fechamentoId: 11, valor: -50, justificativa: "Desconto combinado", criadoPor: "andre" },
    });
  });

  it("sem justificativa → erro, nada gravado", async () => {
    await expect(
      adicionarAjuste({ fechamentoId: 11, valor: 10, justificativa: "ok", usuario: null })
    ).rejects.toThrow(/justificativa/);
    expect(dbMock.fechamentoAjuste.create).not.toHaveBeenCalled();
  });

  it("em fechamento conferido → erro, nada gravado", async () => {
    dbMock.fechamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      adicionarAjuste({ fechamentoId: 11, valor: 10, justificativa: "Diferença de mês", usuario: null })
    ).rejects.toThrow(/em preparação/);
    expect(dbMock.fechamentoAjuste.create).not.toHaveBeenCalled();
  });

  it("remover é lógico (removidoEm) e só em preparação", async () => {
    dbMock.fechamentoAjuste.findUnique.mockResolvedValue({ id: 3, fechamentoId: 11, removidoEm: null });
    await removerAjuste({ ajusteId: 3 });
    expect(dbMock.fechamento.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 11, status: "em_preparacao" } });
    const upd = dbMock.fechamentoAjuste.updateMany.mock.calls[0][0];
    expect(upd.where).toEqual({ id: 3, removidoEm: null });
    expect(upd.data.removidoEm).toBeInstanceOf(Date);

    vi.clearAllMocks();
    dbMock.fechamentoAjuste.findUnique.mockResolvedValue({ id: 3, fechamentoId: 11, removidoEm: null });
    dbMock.fechamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(removerAjuste({ ajusteId: 3 })).rejects.toThrow(/em preparação/);
    expect(dbMock.fechamentoAjuste.updateMany).not.toHaveBeenCalled();
  });

  it("ajuste inexistente → erro", async () => {
    dbMock.fechamentoAjuste.findUnique.mockResolvedValue(null);
    await expect(removerAjuste({ ajusteId: 3 })).rejects.toThrow(/não encontrado/);
  });
});

describe("conferirFechamento", () => {
  const reservadas = (): ParcelaRow[] => [
    parcela(1, { fechamentoId: 11, numeroParcela: 3 }),
    parcela(2, {
      fechamentoId: 11,
      vendaId: 250,
      numeroParcela: 1,
      valorParcela: 200,
      antecipada: true,
      paga: true,
      antecipacaoLoteId: 5,
      antecipacaoLote: { status: "concluido" },
      boletoPrudentId: 9,
      boletoPrudent: { direcionamento: "bfx" },
      venda: { id: 250, cliente: { nome: "BRUNO LIMA", matricula: null, empresaParceiraId: 7 }, _count: { parcelasVencimento: 2 } },
    }),
  ];

  it("cria a versão 1 com a foto das linhas, totais, ajustes e o XLSX; status conferido", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(
      fechamentoEmPreparacao({ ajustes: [{ id: 1, valor: -50, justificativa: "Desconto combinado", removidoEm: null }] })
    );
    dbMock.parcelaVencimento.findMany.mockResolvedValue(reservadas());

    const r = await conferirFechamento({ fechamentoId: 11, usuario: "andre" });

    expect(r).toEqual({ versao: 1 });
    // trava: status, versão atual e "não desatualizado" no where — a edição de venda que soltou
    // reserva no meio marca desatualizado e derruba a conferência
    expect(dbMock.fechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 11, status: "em_preparacao", versaoAtual: 0, desatualizado: false },
      data: { status: "conferido", versaoAtual: 1, desatualizado: false },
    });
    const arq = dbMock.arquivoFinanceiro.create.mock.calls[0][0].data;
    expect(arq.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(arq.nome).toMatch(/\.xlsx$/);
    expect(Buffer.from(arq.conteudo).subarray(0, 2).toString()).toBe("PK");
    const v = dbMock.fechamentoVersao.create.mock.calls[0][0].data;
    expect(v).toMatchObject({
      fechamentoId: 11,
      numero: 1,
      totalBruto: 500,
      totalAjustes: -50,
      totalFinal: 450,
      xlsxArquivoId: 77,
      criadaPor: "andre",
    });
    expect(JSON.parse(v.ajustesJson)).toEqual([{ valor: -50, justificativa: "Desconto combinado" }]);
    expect(v.linhas.create).toEqual([
      {
        parcelaId: 1, vendaId: 240, numeroParcela: 3, totalParcelas: 4, clienteNome: "ANA SOUZA", matricula: "0042",
        valor: 300, vencimento: new Date("2026-10-10T00:00:00Z"), loteId: null, antecipada: false, boletoPrudentId: null,
      },
      {
        parcelaId: 2, vendaId: 250, numeroParcela: 1, totalParcelas: 2, clienteNome: "BRUNO LIMA", matricula: null,
        valor: 200, vencimento: new Date("2026-10-10T00:00:00Z"), loteId: 5, antecipada: true, boletoPrudentId: 9,
      },
    ]);
  });

  it("depois de reabrir, a próxima conferência cria a versão 2", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(fechamentoEmPreparacao({ versaoAtual: 1 }));
    dbMock.parcelaVencimento.findMany.mockResolvedValue(reservadas());
    const r = await conferirFechamento({ fechamentoId: 11, usuario: null });
    expect(r).toEqual({ versao: 2 });
    expect(dbMock.fechamentoVersao.create.mock.calls[0][0].data.numero).toBe(2);
    expect(dbMock.fechamento.updateMany.mock.calls[0][0].where.versaoAtual).toBe(1);
  });

  it("parcela reservada que mudou (ficou inelegível) → erro, nenhuma versão", async () => {
    const ps = reservadas();
    ps[0] = parcela(1, { fechamentoId: 11, paga: true });
    dbMock.parcelaVencimento.findMany.mockResolvedValue(ps);
    await expect(conferirFechamento({ fechamentoId: 11, usuario: null })).rejects.toThrow(
      "Parcelas mudaram desde a geração. Clique em Atualizar parcelas."
    );
    expect(dbMock.fechamentoVersao.create).not.toHaveBeenCalled();
  });

  it("parcela reservada que saiu da competência → erro", async () => {
    const ps = reservadas();
    ps[0] = parcela(1, { fechamentoId: 11, dataVencimento: new Date("2026-11-10T00:00:00Z") });
    dbMock.parcelaVencimento.findMany.mockResolvedValue(ps);
    await expect(conferirFechamento({ fechamentoId: 11, usuario: null })).rejects.toThrow(/Parcelas mudaram/);
  });

  it("fechamento marcado desatualizado → erro", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(fechamentoEmPreparacao({ desatualizado: true }));
    dbMock.parcelaVencimento.findMany.mockResolvedValue(reservadas());
    await expect(conferirFechamento({ fechamentoId: 11, usuario: null })).rejects.toThrow(/Parcelas mudaram/);
    expect(dbMock.fechamentoVersao.create).not.toHaveBeenCalled();
  });

  it("zero parcelas → erro", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
    await expect(conferirFechamento({ fechamentoId: 11, usuario: null })).rejects.toThrow(/Nenhuma parcela/);
    expect(dbMock.fechamentoVersao.create).not.toHaveBeenCalled();
  });

  it("valor final ≤ 0 → erro", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(
      fechamentoEmPreparacao({ ajustes: [{ id: 1, valor: -500, justificativa: "Estorno integral", removidoEm: null }] })
    );
    dbMock.parcelaVencimento.findMany.mockResolvedValue(reservadas());
    await expect(conferirFechamento({ fechamentoId: 11, usuario: null })).rejects.toThrow(
      "O valor final do demonstrativo precisa ser maior que zero."
    );
    expect(dbMock.fechamentoVersao.create).not.toHaveBeenCalled();
  });

  it("ajuste removido não entra na versão", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(
      fechamentoEmPreparacao({ ajustes: [{ id: 1, valor: -50, justificativa: "Desconto", removidoEm: new Date() }] })
    );
    dbMock.parcelaVencimento.findMany.mockResolvedValue(reservadas());
    await conferirFechamento({ fechamentoId: 11, usuario: null });
    const v = dbMock.fechamentoVersao.create.mock.calls[0][0].data;
    expect(v.totalFinal).toBe(500);
    expect(JSON.parse(v.ajustesJson)).toEqual([]);
  });

  it("já conferido → erro; clique duplo (count 0) → erro", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(fechamentoEmPreparacao({ status: "conferido" }));
    await expect(conferirFechamento({ fechamentoId: 11, usuario: null })).rejects.toThrow(/em preparação/);

    dbMock.fechamento.findUnique.mockResolvedValue(fechamentoEmPreparacao());
    dbMock.parcelaVencimento.findMany.mockResolvedValue(reservadas());
    dbMock.fechamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(conferirFechamento({ fechamentoId: 11, usuario: null })).rejects.toThrow(/Recarregue/);
    expect(dbMock.fechamentoVersao.create).not.toHaveBeenCalled();
  });
});

describe("reabrir e marcar enviado", () => {
  it("reabre de conferido/enviado com o status no where", async () => {
    dbMock.fechamento.findUnique.mockResolvedValue(fechamentoEmPreparacao({ status: "enviado", versaoAtual: 1 }));
    await reabrirFechamento({ fechamentoId: 11 });
    expect(dbMock.fechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 11, status: "enviado" },
      data: { status: "em_preparacao" },
    });
  });

  it("não reabre o que está em preparação", async () => {
    await expect(reabrirFechamento({ fechamentoId: 11 })).rejects.toThrow(/reaberto/);
    expect(dbMock.fechamento.updateMany).not.toHaveBeenCalled();
  });

  it("marca enviado só de conferido na versão atual e grava o PDF na versão", async () => {
    await marcarEnviado({ fechamentoId: 11, versao: 2, pdfArquivoId: 55, usuario: "andre" });
    expect(dbMock.fechamento.updateMany).toHaveBeenCalledWith({
      where: { id: 11, status: "conferido", versaoAtual: 2 },
      data: { status: "enviado" },
    });
    const upd = dbMock.fechamentoVersao.updateMany.mock.calls[0][0];
    expect(upd.where).toEqual({ fechamentoId: 11, numero: 2 });
    expect(upd.data).toMatchObject({ pdfArquivoId: 55, enviadaPor: "andre" });
    expect(upd.data.enviadaEm).toBeInstanceOf(Date);
  });

  it("marcar enviado fora de conferido → erro, versão intacta", async () => {
    dbMock.fechamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(marcarEnviado({ fechamentoId: 11, versao: 2, pdfArquivoId: 55, usuario: null })).rejects.toThrow();
    expect(dbMock.fechamentoVersao.updateMany).not.toHaveBeenCalled();
  });
});
