import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { valorTotalVenda, produtosTexto } from '@/lib/venda-utils';
import { buildComissoesWhere } from '@/lib/comissoes-utils';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const where = buildComissoesWhere(searchParams, session);

    // Buscar dados (incluir itens para valorTotalVenda/produtosTexto)
    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: { select: { nome: true } },
        itens: { select: { subtotal: true, produtoNome: true, quantidade: true } },
      },
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

      const totalVenda = valorTotalVenda(venda);
      const produtos = produtosTexto(venda);

      const row = [
        venda.dataVenda.toISOString().split('T')[0],
        `"${venda.vendedor || 'N/A'}"`,
        `"${venda.cliente?.nome || 'N/A'}"`,
        `"${produtos}"`,
        totalVenda.toFixed(2),
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
    return NextResponse.json({ error: 'Erro ao gerar relatório.' }, { status: 500 });
  }
}