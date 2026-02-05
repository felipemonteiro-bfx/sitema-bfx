import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsStr = searchParams.get("ids");
  
  if (!idsStr) {
    return NextResponse.json({ error: "Nenhum ID fornecido" }, { status: 400 });
  }

  const ids = idsStr.split(',').map(Number);

  try {
    const vendas = await prisma.venda.findMany({
      where: { id: { in: ids } },
      include: {
        cliente: {
          select: {
            nome: true,
            cpf: true,
            cnpj: true,
          }
        }
      },
      orderBy: { dataVenda: 'desc' }
    });

    // Gerar CSV
    let csv = '\uFEFFNome do Cliente,Documento (CPF/CNPJ),Produto,Valor Total,Parcelas,Valor da Parcela,Data da Venda
';
    
    vendas.forEach(v => {
      const doc = v.cliente?.cpf || v.cliente?.cnpj || "N/D";
      const valorTotal = (v.valorVenda || 0) + (v.valorFrete || 0);
      const row = [
        `"${v.cliente?.nome || 'N/D'}"`,
        `"${doc}"`,
        `"${v.produtoNome || 'N/A'}"`,
        valorTotal.toFixed(2),
        v.parcelas || 1,
        v.valorParcela?.toFixed(2) || (valorTotal / (v.parcelas || 1)).toFixed(2),
        v.dataVenda.toISOString().split('T')[0]
      ].join(',');
      
      csv += row + '
';
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=relatorio-financeira-${Date.now()}.csv`,
      }
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de antecipação:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
