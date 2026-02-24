import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addMonths } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clienteId = Number(id);

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { renda: true, nome: true }
    });

    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    const renda = cliente.renda || 0;
    const margemTotal = renda * 0.3;
    const tetoParcelaMax = 475;

    // Buscar vendas para calcular comprometimento atual
    const vendas = await prisma.venda.findMany({
      where: { clienteId }
    });

    let comprometimentoAtual = 0;
    const hoje = new Date();
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    vendas.forEach(v => {
      const dv = v.dataVenda;
      const dia = dv.getDate();
      // Lógica de competência: se vendeu até dia 20, primeira parcela é mês seguinte. Se após dia 20, 2 meses depois.
      const inicio = addMonths(new Date(dv.getFullYear(), dv.getMonth(), 1), dia <= 20 ? 1 : 2);
      const fim = addMonths(inicio, v.parcelas || 0);
      
      if (inicio <= mesAtual && mesAtual < fim) {
        comprometimentoAtual += v.valorParcela || 0;
      }
    });

    const margemDisponivel = margemTotal - comprometimentoAtual;

    return NextResponse.json({
      nome: cliente.nome,
      renda,
      margemTotal,
      comprometimentoAtual,
      margemDisponivel,
      tetoParcelaMax
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao consultar limite" }, { status: 500 });
  }
}
