import { addMonths } from "date-fns";

export type FaixaConsignado = "ok" | "alerta" | "limite" | "renda_pendente";

export type ContratoParaCalculo = {
  valorParcela: number;
  competenciaInicioDesconto: string;
  competenciaFimDesconto: string;
  ifConcessoraCodigo?: string;
  contrato?: string;
};

export type VendaParaCalculo = {
  dataVenda: Date;
  parcelas: number | null;
  valorParcela: number | null;
  status: string;
  descontoEmFolha: boolean;
  formaPagamento?: string | null;
};

export type ResultadoConsignado = {
  pct: number | null;
  faixa: FaixaConsignado;
  tomadoConsignado: number;
  tomadoFolhaBfx: number;
  tomado: number;
};

function mesDeCompetencia(texto: string): { ano: number; mes: number } | null {
  const p = texto.trim().split("/");
  if (p.length !== 2) return null;
  const mes = Number(p[0]);
  const ano = Number(p[1]);
  if (!Number.isFinite(mes) || !Number.isFinite(ano) || mes < 1 || mes > 12) return null;
  return { ano, mes };
}

function cobreMes(
  inicio: string,
  fim: string,
  ref: { ano: number; mes: number },
): boolean {
  const i = mesDeCompetencia(inicio);
  const f = mesDeCompetencia(fim);
  if (!i || !f) return false;
  const n = (x: { ano: number; mes: number }) => x.ano * 12 + x.mes;
  return n(i) <= n(ref) && n(ref) <= n(f);
}

export function parcelaFolhaVigenteNoMes(
  venda: VendaParaCalculo,
  mesAtual: Date,
): boolean {
  if (venda.status === "cancelada" || venda.status === "estornada") return false;
  const ehFolha = venda.descontoEmFolha || venda.formaPagamento === "DESCONTO_FOLHA";
  if (!ehFolha) return false;
  const dv = venda.dataVenda;
  const dia = dv.getDate();
  const inicio = addMonths(new Date(dv.getFullYear(), dv.getMonth(), 1), dia <= 20 ? 1 : 2);
  const fim = addMonths(inicio, venda.parcelas || 0);
  return inicio <= mesAtual && mesAtual < fim;
}

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function faixaDePct(pct: number | null): FaixaConsignado {
  if (pct == null) return "renda_pendente";
  if (pct >= 30) return "limite";
  if (pct >= 20) return "alerta";
  return "ok";
}

export function calcularConsignadoDeRegistros(input: {
  renda: number | null;
  contratos: ContratoParaCalculo[];
  vendasFolha: VendaParaCalculo[];
  mesRef?: Date;
}): ResultadoConsignado {
  const refDate = input.mesRef ?? new Date();
  const mesAtual = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const ref = { ano: mesAtual.getFullYear(), mes: mesAtual.getMonth() + 1 };

  const vistos = new Set<string>();
  let tomadoConsignado = 0;
  for (const c of input.contratos) {
    const chave =
      c.ifConcessoraCodigo && c.contrato
        ? `${c.ifConcessoraCodigo}\0${c.contrato}`
        : null;
    if (chave) {
      if (vistos.has(chave)) continue;
      vistos.add(chave);
    }
    if (!cobreMes(c.competenciaInicioDesconto, c.competenciaFimDesconto, ref)) continue;
    tomadoConsignado += c.valorParcela || 0;
  }

  let tomadoFolhaBfx = 0;
  for (const v of input.vendasFolha) {
    if (parcelaFolhaVigenteNoMes(v, mesAtual)) tomadoFolhaBfx += v.valorParcela || 0;
  }

  const tomado = tomadoConsignado + tomadoFolhaBfx;
  const renda = input.renda;
  if (renda == null || renda <= 0) {
    return { pct: null, faixa: "renda_pendente", tomadoConsignado, tomadoFolhaBfx, tomado };
  }
  const pct = arredondar2((tomado / renda) * 100);
  return { pct, faixa: faixaDePct(pct), tomadoConsignado, tomadoFolhaBfx, tomado };
}

export function clientePassaFiltroConsignado(
  cliente: { faixaConsignado: string | null; empresaParceiraId: number | null },
  filtro: { faixa?: string | null; empresaParceiraId?: number | null },
): boolean {
  if (filtro.faixa && cliente.faixaConsignado !== filtro.faixa) return false;
  if (filtro.empresaParceiraId != null && cliente.empresaParceiraId !== filtro.empresaParceiraId) {
    return false;
  }
  return true;
}

export function whereClientesConsignado(filtro: {
  faixa?: string | null;
  empresaParceiraId?: number | null;
}): { faixaConsignado?: string; empresaParceiraId?: number } {
  const where: { faixaConsignado?: string; empresaParceiraId?: number } = {};
  if (filtro.faixa) where.faixaConsignado = filtro.faixa;
  if (filtro.empresaParceiraId != null) where.empresaParceiraId = filtro.empresaParceiraId;
  return where;
}

export const TETO_PARCELA_MAX = 475;

function comprometimentoTodasVendas(vendas: VendaParaCalculo[], mesAtual: Date): number {
  let tomado = 0;
  for (const v of vendas) {
    if (v.status === "cancelada" || v.status === "estornada") continue;
    const dv = v.dataVenda;
    const dia = dv.getDate();
    const inicio = addMonths(new Date(dv.getFullYear(), dv.getMonth(), 1), dia <= 20 ? 1 : 2);
    const fim = addMonths(inicio, v.parcelas || 0);
    if (inicio <= mesAtual && mesAtual < fim) tomado += v.valorParcela || 0;
  }
  return tomado;
}

export function montarPayloadLimite(input: {
  nome: string;
  renda: number | null;
  vendas: VendaParaCalculo[];
  consignado: ResultadoConsignado;
  mesRef?: Date;
}) {
  const renda = input.renda || 0;
  const ref = input.mesRef ?? new Date();
  const mesAtual = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const comprometimentoAtual = comprometimentoTodasVendas(input.vendas, mesAtual);
  const margemTotal = renda * 0.3;
  return {
    nome: input.nome,
    renda,
    margemTotal,
    comprometimentoAtual,
    margemDisponivel: margemTotal - comprometimentoAtual,
    tetoParcelaMax: TETO_PARCELA_MAX,
    tomadoConsignado: input.consignado.tomadoConsignado,
    tomadoFolhaBfx: input.consignado.tomadoFolhaBfx,
    pctConsignado: input.consignado.pct,
    faixaConsignado: input.consignado.faixa,
    margemFolhaTotal: renda * 0.3,
    margemFolhaDisponivel: renda * 0.3 - input.consignado.tomado,
  };
}
