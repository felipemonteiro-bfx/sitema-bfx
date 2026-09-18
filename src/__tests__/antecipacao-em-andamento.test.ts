// Lote em andamento (2026-09-17): o que foi enviado à Prudent e ainda não voltou.
// Sai da fila, mas não conta como antecipado nem como dinheiro.
// Ver docs/superpowers/specs/2026-09-17-antecipacao-em-andamento.md.
import { describe, it, expect } from "vitest";
import {
  parcelasDaVenda,
  resumirAntecipacaoPorComprador,
  resumirAntecipacaoPorMes,
  type VendaParaResumo,
} from "@/lib/antecipacao-compradores";
import { titulosDeVenda } from "@/lib/antecipacao";
import { calcularSelecao, mesesEmAberto } from "@/lib/fila-antecipacao";

const HOJE = "2026-09-17";

function p(vencimento: string, valor: number, extra: Record<string, unknown> = {}) {
  return { numeroParcela: 1, dataVencimento: new Date(`${vencimento}T00:00:00.000Z`), valorParcela: valor, antecipada: false, ...extra };
}

function venda(parcelas: ReturnType<typeof p>[], extra: Partial<VendaParaResumo> = {}): VendaParaResumo & { dataVenda: string } {
  return {
    id: 1,
    status: "ativa",
    antecipada: 0,
    clienteId: 7,
    clienteNome: "LUCIANA FERREIRA DIAS",
    empresa: "AMAZON FIVE",
    dataVenda: "2026-07-12",
    parcelas_detalhes: parcelas.map((x, i) => ({ ...x, numeroParcela: i + 1 })),
    ...extra,
  };
}

describe("balde novo: em andamento", () => {
  it("parcela de lote em andamento não é antecipada nem a antecipar", () => {
    const info = parcelasDaVenda(venda([p("2026-10-10", 300, { emAndamento: true })]), HOJE);
    expect(info.lista[0].situacao).toBe("em_andamento");
    expect(info.contagem).toMatchObject({ antecipadas: 0, emAndamento: 1, aAntecipar: 0, vencidas: 0 });
    expect(info.totais).toMatchObject({ antecipado: 0, emAndamento: 300, faltaAntecipar: 0 });
  });

  it("parcela vencida que está num lote continua em andamento, não vira vencida", () => {
    const info = parcelasDaVenda(venda([p("2026-08-10", 300, { emAndamento: true })]), HOJE);
    expect(info.lista[0].situacao).toBe("em_andamento");
    expect(info.contagem.vencidas).toBe(0);
  });

  it("concluída manda: parcela antecipada e em andamento conta como antecipada", () => {
    const info = parcelasDaVenda(venda([p("2026-10-10", 300, { emAndamento: true, antecipada: true })]), HOJE);
    expect(info.lista[0].situacao).toBe("antecipada");
    expect(info.contagem).toMatchObject({ antecipadas: 1, emAndamento: 0 });
  });

  it("resumo por comprador e totais mostram o balde novo", () => {
    const vendas = [
      venda([p("2026-10-10", 300, { emAndamento: true }), p("2026-11-10", 200), p("2026-08-10", 100, { antecipada: true })]),
    ];
    const resumo = resumirAntecipacaoPorComprador(vendas, HOJE);
    expect(resumo.compradores[0].emAndamento).toEqual({ qtd: 1, valor: 300 });
    expect(resumo.totais.emAndamento).toEqual({ qtd: 1, valor: 300 });
    expect(resumo.totais.aAntecipar.valor).toBe(200);
    expect(resumo.totais.antecipadas.valor).toBe(100);
  });

  it("resumo por mês separa o que está em andamento", () => {
    const meses = resumirAntecipacaoPorMes([venda([p("2026-10-10", 300, { emAndamento: true }), p("2026-10-10", 150)])], HOJE);
    const outubro = meses.find((m) => m.mes === "2026-10");
    expect(outubro?.emAndamento).toEqual({ qtd: 1, valor: 300 });
    expect(outubro?.aAntecipar).toEqual({ qtd: 1, valor: 150 });
  });
});

describe("não mandar a mesma parcela duas vezes", () => {
  const vendaParaLote = {
    id: 1,
    dataVenda: "2026-07-12",
    valorVenda: 500,
    parcelas: 2,
    parcelas_detalhes: [
      { dataVencimento: new Date("2026-10-10T00:00:00.000Z"), valorParcela: 300, antecipada: false, emAndamento: true },
      { dataVencimento: new Date("2026-11-10T00:00:00.000Z"), valorParcela: 200, antecipada: false, emAndamento: false },
    ],
  };

  it("titulosDeVenda ignora a parcela que já está num lote", () => {
    expect(titulosDeVenda(vendaParaLote).map((t) => t.valor)).toEqual([200]);
  });

  it("mesesEmAberto não oferece o mês de uma parcela em andamento", () => {
    expect(mesesEmAberto(vendaParaLote.parcelas_detalhes)).toEqual(["2026-11"]);
  });

  it("o card da seleção não soma a parcela em andamento", () => {
    const r = calcularSelecao([vendaParaLote], null, HOJE);
    expect(r.parcelas).toBe(1);
    expect(r.valorBruto).toBe(200);
  });
});
