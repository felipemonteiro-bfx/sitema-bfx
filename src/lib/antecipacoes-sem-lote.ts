/**
 * Antecipacoes que existem sem lote (QK-DDR/2026-08-11).
 *
 * O Historico de Antecipacoes lista `AnticipacaoBatch` — o lote que a fila da
 * Prudent grava quando roda. Medido em producao: a tabela tem ZERO registros,
 * enquanto 26 vendas estao com o flag `antecipada = 1` e nenhuma parcela com
 * `antecipada = true`. Essas vendas foram marcadas por fora do fluxo da fila
 * (importacao de dados legados ou marcacao manual), entao o historico dizia
 * "Nenhuma antecipacao realizada ainda" ao lado de uma lista de vendas
 * marcadas como "Antecipado" — verdadeiro sobre lotes, enganoso para quem le.
 *
 * Este modulo NAO inventa lote nenhum: apenas separa, para exibicao, o que
 * esta antecipado sem pertencer a um lote. Puro e sem React, para ser testado
 * direto.
 *
 * Data em UTC via `.split("-")`, nunca `new Date("YYYY-MM-DD")` seguido de
 * getter local — esse parse ja fez data aparecer um dia antes (commit d9064ee).
 */

export type VendaAntecipadaSemLote = {
  id: number;
  dataVenda: Date | string;
  clienteNome: string | null;
  empresa: string | null;
  produtos: string;
  valorTotal: number;
  parcelas: number;
};

export type GrupoSemLote = {
  /** Data no formato YYYY-MM-DD, chave do agrupamento. */
  data: string;
  quantidadeVendas: number;
  valorTotal: number;
  vendas: VendaAntecipadaSemLote[];
};

/**
 * Ids de venda que ja pertencem a algum lote. `vendaIds` e um JSON string
 * (ex.: "[1,2,3]") — um lote com JSON corrompido nao pode derrubar a tela,
 * entao ele e ignorado em vez de lancar.
 */
export function idsEmLotes(lotes: { vendaIds: string }[]): Set<number> {
  const ids = new Set<number>();
  for (const lote of lotes) {
    try {
      const lista = JSON.parse(lote.vendaIds);
      if (!Array.isArray(lista)) continue;
      for (const id of lista) {
        const n = Number(id);
        if (Number.isFinite(n)) ids.add(n);
      }
    } catch {
      // Lote com vendaIds ilegivel: ignorado de proposito.
    }
  }
  return ids;
}

/** YYYY-MM-DD em UTC, sem passar por fuso local. */
function chaveDeData(valor: Date | string): string {
  if (typeof valor === "string") {
    // Ja vem "YYYY-MM-DD" ou ISO completo: os 10 primeiros caracteres bastam.
    const partes = valor.split("T")[0].split("-");
    if (partes.length === 3) return `${partes[0]}-${partes[1]}-${partes[2]}`;
  }
  const d = valor instanceof Date ? valor : new Date(valor);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Agrupa por data as vendas antecipadas que nao estao em nenhum lote,
 * da mais recente para a mais antiga.
 */
export function agruparAntecipacoesSemLote(
  vendas: VendaAntecipadaSemLote[],
  idsComLote: Set<number>
): GrupoSemLote[] {
  const porData = new Map<string, GrupoSemLote>();

  for (const venda of vendas) {
    if (idsComLote.has(venda.id)) continue;
    const data = chaveDeData(venda.dataVenda);
    const grupo = porData.get(data) ?? { data, quantidadeVendas: 0, valorTotal: 0, vendas: [] };
    grupo.quantidadeVendas += 1;
    grupo.valorTotal = Math.round((grupo.valorTotal + venda.valorTotal) * 100) / 100;
    grupo.vendas.push(venda);
    porData.set(data, grupo);
  }

  return [...porData.values()].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}
