// Leitura das telas do fechamento (Fase 5): a classificação das parcelas do detalhe e a grade
// empresa × competência. Funções puras.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/regra-empresa-db", () => ({ regrasDaEmpresa: vi.fn() }));

const { classificarParcelas, montarGrade, competenciaSeguinte, montarConciliacao, linkCobrancaAsaas } = await import(
  "@/lib/fechamento-leitura"
);

function parcela(id: number, extra: Record<string, unknown> = {}) {
  const { venda, ...resto } = extra as { venda?: Record<string, unknown> };
  return {
    id, vendaId: 240, numeroParcela: id, dataVencimento: new Date("2026-10-10T00:00:00Z"), valorParcela: 300,
    paga: false, antecipada: false, liquidadaEm: null, fechamentoId: null as number | null,
    confirmacaoRh: "confirmada" as string | null, confirmacaoMotivo: null as string | null,
    antecipacaoLoteId: null, boletoPrudentId: null, antecipacaoLote: null, boletoPrudent: null,
    venda: { id: 240, status: "ativa", cliente: { nome: "ANA", matricula: null, empresaParceiraId: 7 }, _count: { parcelasVencimento: 4 }, ...venda },
    ...resto,
  };
}

const F = { id: 11, empresaParceiraId: 7, competencia: "2026-10" };

describe("classificarParcelas", () => {
  it("separa reservadas, bloqueadas com motivo (e o motivo do RH) e conta as elegíveis novas", () => {
    const r = classificarParcelas(
      [
        parcela(1, { fechamentoId: 11 }),
        parcela(2),
        parcela(3, { confirmacaoRh: "recusada", confirmacaoMotivo: "desligado" }),
        parcela(4, { fechamentoId: 99 }),
        parcela(5, { fechamentoId: 11, dataVencimento: new Date("2026-11-10T00:00:00Z") }),
      ],
      F
    );
    // Revisão: a reservada que saiu do mês (ou ficou inelegível) não aparece como linha do
    // demonstrativo; conta como reserva inválida (a tela pede para atualizar).
    expect(r.reservadas.map((p) => p.id)).toEqual([1]);
    expect(r.reservasInvalidas).toBe(1);
    expect(r.novasElegiveis).toBe(1);
    expect(r.bloqueadas).toEqual([
      { parcelaId: 3, identificador: "V240-3/4", motivo: "recusada_rh", rotulo: "Recusada pelo RH — desligado", valor: 300 },
      { parcelaId: 4, identificador: "V240-4/4", motivo: "em_outro_fechamento", rotulo: "Em outro fechamento", valor: 300 },
    ]);
  });
});

describe("montarGrade", () => {
  const regra = (empresaParceiraId: number, cobrancaViaBfx: boolean, vigenteDe = "2026-01-01") => ({
    empresaParceiraId, vigenteDe: new Date(`${vigenteDe}T00:00:00Z`), vigenteAte: null, diaCorte: 20, diaVencimento: 10,
    diaPix: 15, repassePct: null, repasseBase: null, cobrancaViaBfx,
  });

  it("competências: o mês anterior, o atual e os dois seguintes, mais as dos fechamentos; virada de ano", () => {
    expect(competenciaSeguinte("2026-12")).toBe("2027-01");
    const g = montarGrade({
      hoje: new Date("2026-11-20T12:00:00Z"),
      empresas: [{ id: 7, nome: "A" }],
      regras: [regra(7, true)],
      fechamentos: [{ id: 1, empresaParceiraId: 7, competencia: "2026-09", status: "enviado", desatualizado: false, totalVersao: 450, totalReservado: 999, parcelas: 2 }],
    });
    expect(g.competencias).toEqual(["2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]);
    expect(g.empresas[0].celulas["2026-09"]).toEqual({ tipo: "fechamento", id: 1, status: "enviado", total: 450, parcelas: 2, desatualizado: false, final: null });
    expect(g.empresas[0].celulas["2026-11"]).toEqual({ tipo: "gerar" });
  });

  it("só empresas com cobrança via BFX (ou com fechamento); regra ligada no meio do mês não vale para ele", () => {
    const g = montarGrade({
      hoje: new Date("2026-10-05T12:00:00Z"),
      empresas: [{ id: 7, nome: "A" }, { id: 8, nome: "B" }],
      regras: [regra(7, true, "2026-11-01"), regra(8, false)],
      fechamentos: [],
    });
    expect(g.empresas.map((e) => e.id)).toEqual([7]);
    expect(g.empresas[0].celulas["2026-10"]).toEqual({ tipo: "desligada" });
    expect(g.empresas[0].celulas["2026-11"]).toEqual({ tipo: "gerar" });
  });

  it("em preparação mostra o total reservado; conferido mostra o da versão", () => {
    const g = montarGrade({
      hoje: new Date("2026-10-05T12:00:00Z"),
      empresas: [{ id: 7, nome: "A" }],
      regras: [regra(7, true)],
      fechamentos: [
        { id: 1, empresaParceiraId: 7, competencia: "2026-10", status: "em_preparacao", desatualizado: true, totalVersao: 100, totalReservado: 600, parcelas: 2 },
        { id: 2, empresaParceiraId: 7, competencia: "2026-11", status: "conferido", desatualizado: false, totalVersao: 450, totalReservado: 600, parcelas: 2 },
      ],
    });
    expect(g.empresas[0].celulas["2026-10"]).toMatchObject({ total: 600, desatualizado: true });
    expect(g.empresas[0].celulas["2026-11"]).toMatchObject({ total: 450 });
  });
});

describe("montarGrade — conciliado e concluído (Fase 6)", () => {
  const regra = (empresaParceiraId: number, cobrancaViaBfx: boolean) => ({
    empresaParceiraId, vigenteDe: new Date("2026-01-01T00:00:00Z"), vigenteAte: null, diaCorte: 20, diaVencimento: 10,
    diaPix: 15, repassePct: null, repasseBase: null, cobrancaViaBfx,
  });
  it("a célula leva o estado final do fechamento", () => {
    const g = montarGrade({
      hoje: new Date("2026-10-05T12:00:00Z"),
      empresas: [{ id: 7, nome: "A" }],
      regras: [regra(7, true)],
      fechamentos: [
        { id: 1, empresaParceiraId: 7, competencia: "2026-10", status: "pago", desatualizado: false, totalVersao: 600, totalReservado: 600, parcelas: 2, final: "concluido" },
        { id: 2, empresaParceiraId: 7, competencia: "2026-11", status: "pago", desatualizado: false, totalVersao: 450, totalReservado: 450, parcelas: 2, final: "conciliado" },
        { id: 3, empresaParceiraId: 7, competencia: "2026-12", status: "enviado", desatualizado: false, totalVersao: 450, totalReservado: 450, parcelas: 2 },
      ],
    });
    expect(g.empresas[0].celulas["2026-10"]).toMatchObject({ final: "concluido" });
    expect(g.empresas[0].celulas["2026-11"]).toMatchObject({ final: "conciliado" });
    expect(g.empresas[0].celulas["2026-12"]).toMatchObject({ final: null });
  });
});

describe("montarConciliacao (Fase 6)", () => {
  const linha = (extra: Record<string, unknown> = {}) => ({
    identificador: "V240-1/2", parcelaId: 80, antecipada: true, boletoPrudentId: 1, valor: 300, ...extra,
  });
  const boleto = (extra: Record<string, unknown> = {}) => ({
    id: 1, status: "pago", valorEsperado: 300, valorDocumento: null, direcionamento: "bfx", parcelaIds: [80], ...extra,
  });

  it("pago, boletos pagos e sem divergência → conciliado e concluído", () => {
    const c = montarConciliacao([linha(), linha({ identificador: "V240-2/2", parcelaId: 81, antecipada: false, boletoPrudentId: null })], [boleto()], "pago");
    expect(c).toMatchObject({ somaLinhasAntecipadas: 300, somaBoletos: 300, diferenca: 0, divergencias: [], conciliado: true, concluido: true });
  });

  it("boleto ainda a pagar → nem conciliado", () => {
    expect(montarConciliacao([linha()], [boleto({ status: "a_pagar" })], "pago")).toMatchObject({ conciliado: false, concluido: false });
  });

  it("fechamento não pago → nem conciliado", () => {
    expect(montarConciliacao([linha()], [boleto()], "pago_parcial")).toMatchObject({ conciliado: false });
  });

  it("divergências viram texto legível", () => {
    const c = montarConciliacao(
      [linha({ parcelaId: 90, boletoPrudentId: null, identificador: "V250-1/1" }), linha()],
      [boleto({ valorDocumento: 310 }), boleto({ id: 2, parcelaIds: [99] })],
      "pago"
    );
    const textos = c.divergencias.map((d) => d.texto);
    expect(textos).toContainEqual(expect.stringMatching(/^V250-1\/1: antecipada sem boleto Prudent/));
    expect(textos).toContainEqual(expect.stringMatching(/^Boleto #1: valor do documento R\$\s310,00, parcelas somam R\$\s300,00/));
    expect(textos).toContainEqual(expect.stringMatching(/^Boleto #2: cobre parcela fora do demonstrativo/));
    expect(c.concluido).toBe(false);
  });
});

describe("linkCobrancaAsaas", () => {
  it("fatura pública: sem o prefixo pay_, no ambiente certo", () => {
    expect(linkCobrancaAsaas("pay_080225913252", "production")).toBe("https://www.asaas.com/i/080225913252");
    expect(linkCobrancaAsaas("pay_080225913252", null)).toBe("https://sandbox.asaas.com/i/080225913252");
  });
});
