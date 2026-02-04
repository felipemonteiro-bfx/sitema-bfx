import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Extrair parâmetros de consulta
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

    // Buscar as vendas com os filtros aplicados
    const vendas = await prisma.venda.findMany({
      where,
      select: {
        vendedor: true,
        lucroLiquido: true,
      },
    });

    // Buscar todos os usuários para obter o percentual de comissão
    const usuarios = await prisma.usuario.findMany({
      select: {
        nomeExibicao: true,
        comissaoPct: true,
      },
    });

    // Criar um mapa de nomeExibicao para comissaoPct para acesso rápido
    const comissaoPctMap = new Map();
    usuarios.forEach(usuario => {
      // Usar nomeExibicao para mapear o vendedor da venda
      if (usuario.nomeExibicao) { // Verificar se nomeExibicao existe
        comissaoPctMap.set(usuario.nomeExibicao, usuario.comissaoPct || 0);
      }
    });

    // Calcular as comissões
    const comissoesPorVendedor = new Map<string, number>();

    vendas.forEach(venda => {
      if (venda.vendedor && venda.lucroLiquido !== null) {
        const percentual = comissaoPctMap.get(venda.vendedor);
        if (percentual !== undefined) {
          const comissao = (venda.lucroLiquido * percentual) / 100;
          comissoesPorVendedor.set(venda.vendedor, (comissoesPorVendedor.get(venda.vendedor) || 0) + comissao);
        }
      }
    });

    // Formatar a resposta
    const comissoes = Array.from(comissoesPorVendedor.entries()).map(([vendedor, valorComissao]) => ({
      vendedor,
      valorComissao: parseFloat(valorComissao.toFixed(2)), // Formatar para 2 casas decimais
    }));

    return NextResponse.json(comissoes);
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma Client
  }
}