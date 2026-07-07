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

    // Buscar vendas com detalhes
    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: {
          select: {
            nome: true,
          },
        },
        itens: { select: { subtotal: true, produtoNome: true, quantidade: true } },
      },
      orderBy: {
        dataVenda: 'desc',
      },
    });

    // Buscar usuários para percentuais de comissão
    const usuarios = await prisma.usuario.findMany({
      select: {
        nomeExibicao: true,
        comissaoPct: true,
      },
    });

    const comissaoPctMap = new Map();
    usuarios.forEach(usuario => {
      if (usuario.nomeExibicao) {
        comissaoPctMap.set(usuario.nomeExibicao, usuario.comissaoPct || 0);
      }
    });

    // Calcular detalhes
    const detalhes = vendas.map(venda => {
      const percentual = venda.vendedor ? comissaoPctMap.get(venda.vendedor) : 0;
      const valorComissao = percentual !== undefined
        ? (valorTotalVenda(venda) * percentual) / 100
        : 0;

      return {
        vendaId: venda.id,
        data: venda.dataVenda,
        vendedor: venda.vendedor,
        cliente: venda.cliente?.nome || 'N/A',
        produto: produtosTexto(venda),
        valorVenda: valorTotalVenda(venda),
        lucroLiquido: venda.lucroLiquido,
        percentualComissao: percentual,
        valorComissao: parseFloat(valorComissao.toFixed(2)),
      };
    });

    return NextResponse.json(detalhes);
  } catch (error) {
    console.error('Erro ao buscar detalhes de comissões:', error);
    return NextResponse.json({ error: 'Erro ao buscar detalhes de comissões.' }, { status: 500 });
  }
}