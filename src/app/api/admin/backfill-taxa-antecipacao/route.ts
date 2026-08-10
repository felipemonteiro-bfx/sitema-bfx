import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { WHERE_VENDA_ANTECIPAVEL } from "@/lib/antecipacao";
import { custoAntecipacaoVenda } from "@/lib/antecipacao-custo";
import { valorTotalVenda } from "@/lib/venda-utils";
import { revalidarVenda } from "@/lib/revalidacao";

/**
 * Backfill administrativo de `Venda.taxaFinanceiraValor` para vendas antigas
 * em desconto em folha (QK-LGJ-03).
 *
 * Decisao de retroatividade: a coluna `taxa_financeira_valor` e hoje
 * integralmente nula e nada em `src/` a lê — preenchê-la NÃO é reescrever
 * histórico. O lucro já gravado na venda antiga, esse sim histórico (a
 * comissão já apurada saiu dele), NÃO é tocado por esta rota: o `data` de
 * todo `venda.update` do POST contém apenas `taxaFinanceiraValor`.
 *
 * Consequência deliberada: no histórico e nas comissões a venda antiga
 * continua com o lucro de antes; o DRE — que recalcula do zero a cada
 * render (`src/lib/finance.ts`) — passa a mostrar o custo real da Prudent
 * nos meses passados assim que a coluna é preenchida.
 *
 * `GET` é prévia (não escreve nada); `POST` aplica só onde a coluna está
 * nula, então rodar duas vezes não muda nada na segunda passada.
 */

type VendaParaBackfill = {
  id: number;
  dataVenda: Date;
  formaPagamento: string | null;
  descontoEmFolha: boolean;
  parcelas: number | null;
  valorVenda: number | null;
  quantidade: number | null;
  valorFrete: number | null;
  desconto: number | null;
  itens: { subtotal: number }[];
  parcelasVencimento: { dataVencimento: Date; valorParcela: number }[];
};

/**
 * Vendas antecipáveis (`WHERE_VENDA_ANTECIPAVEL`, o mesmo filtro que decide
 * quem entra na fila da Prudent) que ainda não têm a taxa gravada. Não
 * filtra por status: `finance.ts` já exclui cancelada/estornada do DRE, e a
 * coluna descreve a venda independentemente do status — menos condição,
 * menos surpresa.
 */
async function buscarVendasParaBackfill(): Promise<VendaParaBackfill[]> {
  return prisma.venda.findMany({
    where: { ...WHERE_VENDA_ANTECIPAVEL, taxaFinanceiraValor: null },
    select: {
      id: true,
      dataVenda: true,
      formaPagamento: true,
      descontoEmFolha: true,
      parcelas: true,
      valorVenda: true,
      quantidade: true,
      valorFrete: true,
      desconto: true,
      itens: { select: { subtotal: true } },
      parcelasVencimento: { select: { dataVencimento: true, valorParcela: true } },
    },
  });
}

function calcularPreview(vendas: VendaParaBackfill[]) {
  return vendas.map((v) => {
    const valorTotal = valorTotalVenda(v);
    const taxa = custoAntecipacaoVenda({
      formaPagamento: v.formaPagamento,
      descontoEmFolha: v.descontoEmFolha,
      dataVenda: v.dataVenda,
      valorVenda: valorTotal,
      parcelas: v.parcelas,
      parcelas_detalhes: v.parcelasVencimento.length > 0 ? v.parcelasVencimento : undefined,
    });
    return { id: v.id, dataVenda: v.dataVenda, valorTotal, parcelas: v.parcelas, taxa };
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado. Requer perfil admin." }, { status: 401 });
  }
  try {
    const vendas = await buscarVendasParaBackfill();
    const preview = calcularPreview(vendas);
    return NextResponse.json({ total: preview.length, preview });
  } catch (err) {
    console.error("[backfill-taxa-antecipacao] Erro no GET:", err);
    return NextResponse.json({ error: "Erro ao calcular a prévia do backfill." }, { status: 500 });
  }
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado. Requer perfil admin." }, { status: 401 });
  }
  try {
    const vendas = await buscarVendasParaBackfill();
    const preview = calcularPreview(vendas);

    let atualizadas = 0;
    let ignoradas = 0;
    for (const item of preview) {
      if (item.taxa == null) {
        ignoradas++;
        continue;
      }
      // So a coluna da taxa — nunca lucroLiquido. Preencher coluna vazia nao
      // e reescrever historico financeiro (QK-LGJ-03).
      await prisma.venda.update({
        where: { id: item.id },
        data: { taxaFinanceiraValor: item.taxa },
      });
      atualizadas++;
    }

    revalidarVenda();
    return NextResponse.json({ atualizadas, ignoradas });
  } catch (err) {
    console.error("[backfill-taxa-antecipacao] Erro no POST:", err);
    return NextResponse.json({ error: "Erro ao aplicar o backfill." }, { status: 500 });
  }
}
