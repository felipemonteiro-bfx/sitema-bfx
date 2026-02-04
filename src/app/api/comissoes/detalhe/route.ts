import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedorFiltro = searchParams.get('vendedor');
    const dataInicioStr = searchParams.get('dataInicio');
    const dataFimStr = searchParams.get('dataFim');

    // Construir filtros para o Prisma
    const where: any = {};

    if (vendedorFiltro) {
      where.vendedor = vendedorFiltro;
    }

    if (dataInicioStr || dataFimStr) {
      where.dataVenda = {};
      if (dataInicioStr) {
        where.dataVenda.gte = new Date(dataInicioStr);
      }
      if (dataFimStr) {
        where.dataVenda.lte = new Date(dataFimStr);
      }
    }

    // Buscar vendas com detalhes
    const vendas = await prisma.venda.findMany({
      where,
      include: {
        cliente: {
          select: {
            nome: true,
          },
        },
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
      const valorComissao = (percentual !== undefined && venda.lucroLiquido !== null)
        ? (venda.lucroLiquido * percentual) / 100
        : 0;

      return {
        vendaId: venda.id,
        data: venda.dataVenda,
        vendedor: venda.vendedor,
        cliente: venda.cliente?.nome || 'N/A',
        produto: venda.produtoNome,
        valorVenda: venda.valorVenda,
        lucroLiquido: venda.lucroLiquido,
        percentualComissao: percentual,
        valorComissao: parseFloat(valorComissao.toFixed(2)),
      };
    });

    return NextResponse.json(detalhes);
  } catch (error) {
    console.error('Erro ao buscar detalhes de comissões:', error);
    return NextResponse.json({ error: 'Failed to fetch commission details' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}