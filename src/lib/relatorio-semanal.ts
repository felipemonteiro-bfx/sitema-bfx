import { valorTotalVenda } from "@/lib/venda-utils";

export type VendaSemanal = {
  id: number;
  dataVenda: Date;
  vendedor?: string | null;
  parcelas?: number | null;
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
  desconto?: number | null;
  itens?: { produtoNome: string; quantidade: number; subtotal: number }[];
  cliente?: { nome?: string | null; matricula?: string | null; empresa?: string | null; empresaParceiraId?: number | null } | null;
};

export type GrupoVendaSemanal = {
  inicio: string;
  fim: string;
  vendas: VendaSemanal[];
  total: number;
};

const DIA = 24 * 60 * 60 * 1000;

function inicioUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatarDataUtc(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

/**
 * Divide as vendas do mês em blocos de sábado a sexta-feira, recortados pelos
 * limites do mês e pelo último dia disponível do consolidado.
 */
export function agruparVendasPorSemana(
  vendas: VendaSemanal[],
  inicioMes: Date,
  fimPeriodo: Date
): GrupoVendaSemanal[] {
  const inicio = inicioUtc(inicioMes);
  const fim = inicioUtc(fimPeriodo);
  if (inicio > fim) return [];

  const grupos: GrupoVendaSemanal[] = [];
  let grupoInicio = inicio;

  while (grupoInicio <= fim) {
    const diaSemana = grupoInicio.getUTCDay(); // domingo=0 ... sábado=6
    const diasAteSexta = (5 - diaSemana + 7) % 7;
    const grupoFim = new Date(Math.min(grupoInicio.getTime() + diasAteSexta * DIA, fim.getTime()));
    const vendasDoGrupo = vendas
      .filter((v) => {
        const data = inicioUtc(v.dataVenda);
        return data >= grupoInicio && data <= grupoFim;
      })
      .sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime() || a.id - b.id);

    grupos.push({
      inicio: formatarDataUtc(grupoInicio),
      fim: formatarDataUtc(grupoFim),
      vendas: vendasDoGrupo,
      total: vendasDoGrupo.reduce((total, venda) => total + valorTotalVenda(venda), 0),
    });

    grupoInicio = new Date(grupoFim.getTime() + DIA);
  }

  return grupos;
}
