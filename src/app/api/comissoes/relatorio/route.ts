import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorFiltro = searchParams.get('vendedor');
    const dataInicioStr = searchParams.get('dataInicio');
    const dataFimStr = searchParams.get('dataFim');

    // Construir filtros
    const where: any = {};
    if (vendedorFiltro) where.vendedor = vendedorFiltro;
    if (dataInicioStr || dataFimStr) {
      where.dataVenda = {};
      if (dataInicioStr) where.dataVenda.gte = new Date(dataInicioStr);
      if (dataFimStr) where.dataVenda.lte = new Date(dataFimStr);
    }

    // Buscar dados
    const vendas = await prisma.venda.findMany({
      where,
      include: { cliente: { select: { nome: true } } },
      orderBy: { dataVenda: 'desc' }
    });

    const usuarios = await prisma.usuario.findMany({
      select: { nomeExibicao: true, comissaoPct: true }
    });

    const comissaoPctMap = new Map();
    usuarios.forEach(u => {
      if (u.nomeExibicao) comissaoPctMap.set(u.nomeExibicao, u.comissaoPct || 0);
    });

    // Gerar CSV
    let csv = '\uFEFFData,Vendedor,Cliente,Produto,Valor Venda,Lucro Liquido,Comissao (%),Valor Comissao\n';
    
    vendas.forEach(venda => {
      const pct = venda.vendedor ? comissaoPctMap.get(venda.vendedor) : 0;
      const valorComissao = (pct !== undefined && venda.lucroLiquido !== null)
        ? (venda.lucroLiquido * pct) / 100
        : 0;

      const row = [
        venda.dataVenda.toISOString().split('T')[0],
        `"${venda.vendedor || 'N/A'}"`,
        `"${venda.cliente?.nome || 'N/A'}"`,
        `"${venda.produtoNome || 'N/A'}"`,
        venda.valorVenda?.toFixed(2) || '0.00',
        venda.lucroLiquido?.toFixed(2) || '0.00',
        pct?.toString() || '0',
        valorComissao.toFixed(2)
      ].join(',');
      
      csv += row + '\n';
    });

    // Retornar CSV como download
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=relatorio-comissoes.csv',
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}